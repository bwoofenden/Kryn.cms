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



/**
 * 
 * Motherclass for all extension class.
 * 
 * 
 * @author MArc Schmidt <marc@kryn.org>
 */

class baseModule {


    public function getTitle(){
        return _l( $this->name );
    }
    
    
    /**
     * 
     * Framework controller
     * 
     */
    public function admin(){
        $found = true;
        if( getArgv(3) == ''){
            $found = false;
        }
        $function = '';
        $c = 3;
        while( $found ){
            $function .= getArgv($c).'_';
            $c++;
            if( getArgv($c) == '' )
                $found = false;
        }
        
        $function = substr( $function, 0, strlen($function)-1 );
        if( method_exists( $this, $function ) ){
            return $this->$function();
        } else {
            json('method-not-found');
        }
    
    }
    
    public function install(){
        
    }
    
    public function deinstall(){
        
    }

}

class modul extends baseModule {

}

?>
