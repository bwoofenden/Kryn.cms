<?php

/*
 * This file is part of Kryn.cms.
 *
 * (c) Kryn.labs, MArc Schmidt <marc@kryn.org>
 *
 * To get the full copyright and license informations, please view the
 * LICENSE file, that was distributed with this source code.
 *
 */



class krynCache {
    
    public $type;
    
    public $config;
    
    function __construct( $pType, $pConfig ){
    
        $this->type = $pType;
        $this->config = $pConfig;

        switch( $this->type ){
            case 'memcached':
                if( !$this->initMemcached() ){
                    klog('cache', _l('Can not load the memcache(d) class. Fallback to file caching.'));
                    $this->type = 'files';
                    $this->config['files_path'] = 'inc/cache/';
                }
                break;
            case 'redis':
                if( !$this->initRedis() ){
                    klog('cache', _l('Can not load the Redis class. Fallback to file caching.'));
                    $this->type = 'files';
                    $this->config['files_path'] = 'inc/cache/';
                } 
                break;
        }
        
        if( $this->type == 'files' ){
            if( !is_dir($this->config['files_path']) ){
                if( !mkdir($this->config['files_path']) ){
                    die('Can not create cache folder: '.$this->config['files_path']);
                }
            }
        }

    }
    
    public function initRedis(){
        
        if( !class_exists('Redis') ) return false;

        $this->redis = new Redis;

        foreach( $this->config['servers'] as $server ){
            $this->redis->connect( $server['ip'], $server['port']+0 );
        }
        
        $this->redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_IGBINARY);
        
        return true;
    }
    
    public function initMemcached(){
    
        if( class_exists('Memcache') ){
            $this->memcache = new Memcache;
            foreach( $this->config['servers'] as $server ){
                $this->memcache->addServer( $server['ip'], $server['port']+0 );
            }
        } else if( class_exists('Memcached') ){
            $this->memcached = new Memcached;
            foreach( $this->config['servers'] as $server ){
                $this->memcached->addServer( $server['ip'], $server['port']+0 );
            }
        } else {
            return false;
        }
    
        return true;
    }
    
    /**
     * 
     * Returns the content of the specified cache-key
     * @param string $pCode
     * @return string
     * @static
     */
    public function &get( $pCode, $pProcessCacheInformation = true ){
        global $kcache;

        switch( $this->type ){
            case 'memcached':

                if( $this->memcache ){
                    $res = $this->memcache->get( $pCode );
                } else if( $this->memcached ){
                    $res = $this->memcached->get( $pCode );
                }

            case 'redis':
                
                $res = $this->redis->get( $pCode );

            case 'files':

                $cacheCode = 'krynPhpCache_'.$pCode;
                include( $this->config['files_path'].$pCode.'.php' );
                $res =& $kcache[$cacheCode];

        }
    
        if( !$pProcessCacheInformation ) return $res;
    
        if( !$res['value'] || !$res['time'] ) return false;
        if( $res['timeout'] < time() ) return false;
        
        //valid cache
        //search if a parent has been flagged as invalid
        if( strpos( $pCode, '_' ) !== false ){

            $parents = explode( '_', $pCode );
            $code = '';
            if( is_array($parents) ){
                foreach( $parents as $parent ){
                    $code .= $parent;
                    $invalidateTime = $this->getInvalidate($code);
                    if( $invalidateTime && $invalidateTime > $res['time'] ){
                        return false;
                    }
                    $code .= '_';
                }
            }
        }
        return $res['value'];
    }
    
    /**
     * Returns the invalidation time
     *
     * @param string $pCode
    */
    public function getInvalidate( $pCode ){
        $res = $this->get( $pCode.'_i', false );
        return $res;
    }

    
    /**
     * Marks a code as invalidate until $pTime
     *
     * @param string $pCode
     * @param integer $pTime Timestamp. Default is time()
    */
    public function invalidate( $pCode, $pTime = false ){
    
        $this->set( $pCode.'_i', $pTime?$pTime:time(), time()+(3600*24*20), false );
    
    }
    
    /**
     * 
     * Sets a content to the specified cache-key.
     * Kryn uses MemCache or PHP-Caching
     * @param string $pCode
     * @param mixed $pValue
     * @param integer $pTimeout Timestamp. Default is one hour + time()
     */
    public function set( $pCode, $pValue, $pTimeout = false, $pWithCacheInformations = true ){
        global $kcache;
        
        if( $pWithCacheInformations ){
            $pValue = array(
                'timeout' => $pTimeout?$pTimeout:time()+3600,
                'time' => time(),
                'value' => $pValue
            );
        }

        switch( $this->type ){
            case 'memcached':
            
                if( $this->memcache ){
                    return $this->memcache->set( $pCode, $pValue, 0, $pTimeout?$pTimeout:null );
                } else if( $this->memcached ){
                    return $this->memcached->set( $pCode, $pValue, $pTimeout?$pTimeout:null);
                }
            
            case 'redis':

                if( $pTimeout )
                    return $this->redis->setex( $pCode, $pTimeout, $pValue );
                else
                    return $this->redis->set( $pCode, $pValue );

            case 'files':

                $cacheCode = 'krynPhpCache_'.$pCode;

                $varname = '$kcache[\''.$cacheCode.'\'] ';
                $phpCode = "<"."?php \n$varname = ".var_export($pValue,true).";\n ?".">";
                kryn::fileWrite($this->config['files_path'].$pCode.'.php', $phpCode);
                return file_exists( $this->config['files_path'].$pCode.'.php' );
        }
    }
    
    /**
     * Clears the content for specified cache-key.
     *
     * @param string $pCode
     */
    public function clear( $pCode ){
        global $kcache;
        
        switch( $this->type ){
            case 'memcached':
            
                if( $this->memcache ){
                    return $this->memcache->delete( $pCode );
                } else if( $this->memcached ){
                    return $this->memcached->delete( $pCode );
                }
            
            case 'redis':
                
                return $this->redis->delete( $pCode, $pValue );
                
            case 'files':
            
                $cacheCode = 'krynPhpCache_'.$pCode;
                unset($kcache[$cacheCode]);
                @unlink($this->config['files_path'].$pCode.'.php');
        }
    }
    
    /**
     * Clears the content for specified cache-key.
     *
     * @param string $pCode
     */
    public function delete( $pCode ){
        return $this->clear( $pCode );
    }
}

?>