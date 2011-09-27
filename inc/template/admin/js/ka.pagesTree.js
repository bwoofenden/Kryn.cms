ka.pagesTree = new Class({
	
    Implements: Events,
	ready: false,
	
	items: {},
        
    types: {
        '0': 'page_green.png',
        '1': 'page_green.png',
        '2': 'folder.png',
        '3': 'page_white_text.png',
        '-1': 'world.png'
    },
    
    firstTimeAlreadyLoaded: false,
    
    //contains the open state of the pages
    opens: {},
	
    initialize: function( pContainer, pDomain, pOptions ){
        this.options = pOptions;
        this.domain_rsn = pDomain;
        this.container = pContainer;
        
        this._pages = new Hash();
        this._pagesParent = new Hash();
        
        this.main = new Element('div', {
            'class': 'ka-pageTree'
        }).inject( this.container );
        
        this.topDummy = new Element('div', {
            'class': 'ka-pageTree-top-dummy'
        }).inject( this.main );
        
        this.panePagesTable = new Element('table', {
        	style: 'width: 100%',
        	cellpadding: 0,
        	cellspacing: 0
        }).inject( this.main );
        
        this.container.addEvent('scroll', this.setDomainPosition.bind(this));
        
        this.panePagesTBody = new Element('tbody').inject( this.panePagesTable );
        this.panePagesTr = new Element('tr').inject( this.panePagesTBody );
        this.panePagesTd = new Element('td').inject( this.panePagesTr );

        this.panePages = new Element('div', {
            'class': 'ka-pageTree-pages'
        }).inject( this.panePagesTd );
        
        this.paneDomain = new Element('div', {
            'class': 'ka-pageTree-domain'
        }).inject( this.main );
        
        this.paneDomain.set('morph', {duration: 200});
        
        this.loadFirstLevel();
        
        this.main.addEvent('click', this.onClick.bind(this));
        this.main.addEvent('mousedown', this.onMousedown.bind(this));
    },
    
    setDomainPosition: function(){
    
        var size = this.container.getSize();
        var nLeft = this.container.scrollLeft;
        var nWidth = size.x;
        var nTop = 0;
    
        var panePos = this.panePagesTable.getPosition(this.container).y;
        if( panePos-20 < 0 ){
            nTop = (panePos-20)*-1;
            var maxTop = this.panePages.getSize().y-20;
            if( nTop > maxTop ) nTop = maxTop;
        }
    
        this.paneDomain.morph({
            'width': nWidth,
            'left': nLeft,
            'top': nTop
        });
    
    },
    
    loadFirstLevel: function(){

        new Request.JSON({url: _path+'admin/pages/getTreeDomain', noCache: 1, onComplete: this.renderFirstLevel.bind(this)}).get({
            domain_rsn: this.domain_rsn
        });

    },
    
    renderFirstLevel: function( pDomain ){

        this.paneDomain.empty();
        this.panePages.empty();
        this.panePages.setStyle('display', '');
        
        this.domainA = this.addItem( pDomain, this.paneDomain );
        this.domainA.pageTreeObj = this;

        if( this.options.withPageAdd ){
            if( ka.checkDomainAccess( pDomain.rsn, 'addPages' ) ){
                new Element('img', {
                    src: _path+'inc/template/admin/images/icons/add.png',
                    title: _('Add page'),
                    'class': 'ka-pageTree-add'
                })
		        .addEvent('click', function(e){
		            this.options.withPageAdd( pDomain.rsn );
		        }.bind(this))
		        .inject( this.items[0] );
            }
        }

    },
    
    onMousedown: function( e ){
        e.preventDefault();

    },

    onClick: function( e ){
    
        var target = e.target;
        if( !target ) return;
        var a = null;
        
        if( target.hasClass('ka-pageTree-item') )
            a = target;
        
        if( !a && target.getParent('.ka-pageTree-item') )
            a = target.getParent('.ka-pageTree-item');
        
        if( !a ) return;
        
        var item = a.retrieve('item');
        if( item.domain ){

            if( this.options.no_domain_select != true ){
                if( this.options.onDomainClick )
                    this.options.onDomainClick( item, a );
                if( this.options.onSelection )
                    this.options.onSelection( item, a );
                
                this.unselect();
                if( this.options.noActive != true )
                    a.addClass('ka-pageTree-item-selected');
                    
                this.lastSelectedItem = a;
                this.lastSelectedPage = item;
            }

        } else {
        
            if( this.options.onSelection )
                this.options.onSelection( item, a );
            if( this.options.onClick )
                this.options.onClick( item, a );

            this.unselect();

            if( this.options.noActive != true )
                a.addClass('ka-pageTree-item-selected');

            this.lastSelectedItem = a;
            this.lastSelectedPage = item;
        }
    
    },
    
    reloadParentOfActive: function(){
    
        if( !this.lastSelectedItem ) return;
        
        if( this.lastSelectedPage.domain ){
            this.reload();
            return;
        }
        
        var parent = this.lastSelectedItem.getParent().getPrevious();
        if( parent && parent.hasClass('ka-pageTree-item') ){
            this.loadChilds( parent );
        }
    
    },

    addItem: function( pItem, pParent ){
        
        var a = new Element('div', {
            'class': 'ka-pageTree-item',
            title: 'ID='+pItem.rsn
        });
        
        var container = pParent;
        if( pParent.childContainer ){
            container = pParent.childContainer;
            a.parent = pParent;
        }
        
        a.inject( container );

        a.pageTreeObj = this;

        a.span = new Element('span', {
            'class': 'ka-pageTree-item-title',
            text: (pItem.title)?pItem.title:pItem.domain
        }).inject( a );
        
        if( this.lastSelectedPage &&
            (!this.lastSelectedPage.domain || this.lastSelectedPage.domain == pItem.domain)
            &&
            this.lastSelectedPage.rsn == pItem.rsn
        ){
            if( this.options.noActive != true )
                a.addClass('ka-pageTree-item-selected');
            this.lastSelectedItem = a;
            this.lastSelectedPage = pItem;
        }

        if( pItem.domain ){
            this.items[0] = a;
        } else {
            this.items[ pItem.rsn ] = a;
            //Drag'n'Drop
            if( !this.options.noDrag ){
                a.addEvent( 'mousedown', function(e){
                	
                    if( !ka.checkPageAccess( pItem.rsn, 'movePages' ) ){
                    	return;
                    }

                    a.store( 'mousedown', true );
                    if( this.options.move != false ){
                        (function(){
                            if( a.retrieve('mousedown') ){
                                this.createDrag( a, e );
                            }
                        }).delay(200, this)
                        e.stop();
                    }
                }.bind(this))
            }
        }
        
        a.addEvent( 'mouseout', function(){
            this.store( 'mousedown', false );
        });
        a.addEvent( 'mouseup', function(){
            this.store( 'mousedown', false );
        });

        var parentA = a.getParent().getPrevious();
        if( !parentA )
            parentA = a.getParent().getParent().getParent().getParent().getParent().getPrevious();

        if( !pItem.domain && parentA ){
            a.setStyle('padding-left', parentA.getStyle('padding-left').toInt()+15);
        }

        a.store('item', pItem);

        /* masks */
        a.masks = new Element('span', {
            'class': 'ka-pageTree-item-masks'
        }).inject( a, 'top' );

        new Element( 'img', {
            'class': 'ka-pageTree-item-type',
            src: _path+'inc/template/admin/images/icons/'+this.types[pItem.type]
        }).inject( a.masks );
        
        
        if( (pItem.type == 0 || pItem.type == 1) && pItem.visible == 0 ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/invisible.png'
            }).inject( a.masks );
        }

        if( pItem.type == 1 ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/link.png'
            }).inject( a.masks );
        }

        if( (pItem.type == 0 || pItem.type == 3) && pItem.draft_exist == 1){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/draft_exist.png'
            }).inject( a.masks );
        }

        if( pItem.access_denied == 1 ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/access_denied.png'
            }).inject( a.masks );
        }
        
        if( pItem.type == 0 && pItem.access_from_groups != "" && typeOf(pItem.access_from_groups) == 'string' ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/access_group_limited.png'
            }).inject( a.masks );
        }

        /* toggler */
        a.toggler = new Element('img', {
            'class': 'ka-pageTree-item-toggler',
            title: _('Open/Close subitems'),
            src: _path+'inc/template/admin/images/icons/tree_plus.png'
        }).inject( a, 'top' );

        if( !pItem.hasChilds && (!pItem.childs || pItem.childs.length == 0 ) ){
            a.toggler.setStyle('visibility', 'hidden');
        } else {
            a.toggler.addEvent('click', function(e){
                e.stopPropagation();
                this.toggleChilds(a);
            }.bind(this));
        }
        
        /* childs */
        if( pItem.domain ){
            a.childContainer = this.panePages;
        } else {
            a.childContainer = new Element('div', {
                'class': 'ka-pageTree-item-childs'
            }).inject( container );
        }
        
        
        if( pItem.childs ){
            a.childsLoaded = true;
            Array.each(pItem.childs, function(item){
                this.addItem( item, a );
            }.bind(this));           
        } else {
            a.childsLoaded = false;
        }
        
        var openId =( pItem.domain )?'p'+pItem.rsn:pItem.rsn;

        if( !this.firstTimeAlreadyLoaded ){
        
            if( this.options.load_page_childs && this.options.load_page_childs.contains(pItem.rsn) ){
                this.openChilds( a );
                return a;
            } else if( this.options.selectDomain && pItem.domain ){
                a.addClass('ka-pageTree-item-selected');
                this.lastSelectedItem = a;
                this.lastSelectedPage = pItem;
            }
        } else if( this.opens[openId] && a.childContainer.getStyle('display') != 'block' ){
            this.openChilds( a );
        }
        
        this.firstTimeAlreadyLoaded = true;
    
        return a;
    },
    
    toggleChilds: function( pA ){

        if( pA.childContainer.getStyle('display') != 'block' ){
            this.openChilds( pA );
        } else {
            this.closeChilds( pA );
        }
    },
    
    closeChilds: function( pA ){
        var item = pA.retrieve('item');
        var id = item.domain?'p'+item.rsn:item.rsn;
        
        pA.childContainer.setStyle( 'display', '' );
        pA.toggler.set('src', _path+'inc/template/admin/images/icons/tree_plus.png');
        this.opens[ id ] = false;
    },
    
    openChilds: function( pA ){
    
        if( pA.childContainer.getStyle('display') == 'block' ) return;
        
        var item = pA.retrieve('item');
        var id = item.domain?'p'+item.rsn:item.rsn;
    
        pA.toggler.set('src', _path+'inc/template/admin/images/icons/tree_minus.png');
        if( pA.childsLoaded == true ){
            pA.childContainer.setStyle( 'display', 'block' );
            this.opens[ id ] = true;
        } else {
            this.loadChilds( pA, true );
        }

    },
    
    reloadChilds: function( pA ){
        this.loadChilds( pA, false );
    },
    
    loadChilds: function( pA, pAndOpen ){
    
        
        var loader = new Element('img', {
            src: _path+'inc/template/admin/images/loading.gif'
        }).inject( pA.masks )

        var item = pA.retrieve('item');
        var id =( item.domain )?'p'+item.rsn:item.rsn;
        
        new Request.JSON({url: _path+'admin/pages/getTree', noCache: 1, onComplete: function( pItems ){

            pA.childContainer.empty();
            
            loader.destroy();
            
            if( pAndOpen ){
                pA.toggler.set('src', _path+'inc/template/admin/images/icons/tree_minus.png');
                pA.childContainer.setStyle( 'display', 'block' );                
                this.opens[ id ] = true;
            }
            
            pA.childsLoaded = true;
        
            if( pItems.length == 0 ){
                pA.toggler.setStyle('visibility', 'hidden');
                return;
            }

            Array.each(pItems, function(item){
                this.addItem( item, pA );
            }.bind(this));
        
        }.bind(this)}).get({ page_rsn: item.rsn });
    
    },
    
    unselect: function(){

        if( this.lastSelectedItem )
            this.lastSelectedItem.removeClass('ka-pageTree-item-selected');

        this.options.select_rsn = -1;
        this.lastSelectedItem = false;
        this.lastSelectedPage = false;
    },
    
    createDrag: function( pA, pEvent ){

        this.currentPageToDrag = pA;
        
        var kwin = pA.getParent('.kwindow-border');

        if( this.lastClone )
            this.lastClone.destroy();
            
        this.lastClone = new Element('div', {
            'class': 'ka-pageTree-drag-box',
        })
        .inject( kwin );
        
        new Element('span', {
            text: pA.get('text')
        }).inject( this.lastClone );
        
        pA.masks.clone().inject( this.lastClone, 'top' );
        
        var drag = this.lastClone.makeDraggable( {
            snap: 0,
            onDrag: function( pDrag, pEvent ){
                if( !pEvent.target ) return;
                var element = pEvent.target;
                
                if( !element.hasClass('ka-pageTree-item') )
                    element = element.getParent('.ka-pageTree-item');

                if( element ){

                    var pos = pEvent.target.getPosition( document.body );
                    var size = pEvent.target.getSize();
                    var mrposy = pEvent.client.y-pos.y;
                    
                    
                    if( mrposy < 5 ){
                        this.createDropElement( element, 'before');
                    } else if( size.y-mrposy < 5 ){
                        this.createDropElement( element, 'after');
                    } else {
                        //middle
                        this.createDropElement( element, 'inside');
                    }
                
                }
            }.bind(this),
            onDrop: this.cancelDragNDrop.bind(this),
            onCancel: function(){
                this.cancelDragNDrop( true );
            }.bind(this)
        });

        this.inDragMode = true;
        this.inDragModeA = pA;

        var pos = kwin.getPosition( document.body );

        this.lastClone.setStyles({
            'left': pEvent.client.x+5-pos.x,
            'top': pEvent.client.y+5-pos.y
        });
        
        document.addEvent('mouseup', this.cancelDragNDrop.bind(this, true));

        drag.start( pEvent );
    },
    
    createDropElement: function( pTarget, pPos ){
    
        this.dragNDropElement = pTarget;
        this.dragNDropPos = pPos;
                        
        if( this.loadChildsDelay ) clearTimeout( this.loadChildsDelay );
        
        if( this.dropElement ){
            this.dropElement.destroy();
            delete this.dropElement;
        }
        
        if( this.dropLastItem ){
            this.dropLastItem.removeClass('ka-pageTree-item-dragOver');
            this.dropLastItem.setStyle('padding-bottom', 1);
            this.dropLastItem.setStyle('padding-top', 1);
        }
        
        var item = pTarget.retrieve('item');
        
    
        pTarget.setStyle('padding-bottom', 1);
        pTarget.setStyle('padding-top', 1);
        
        if( !item.domain ){
            if( pPos == 'after' || pPos == 'before' ){
                this.dropElement = new Element('div', {
                    'class': 'ka-pageTree-dropElement',
                    styles: {
                        'margin-left': pTarget.getStyle('padding-left').toInt()+16
                    }
                });
            } else {
                if( this.lastDropElement == pTarget )
                    return;
            }
        }

        if( !item.domain && pPos == 'after' ){
            this.dropElement.inject( pTarget.getNext(), 'after');
            pTarget.setStyle('padding-bottom', 0);
            
        } else if( !item.domain && pPos == 'before' ) {
            this.dropElement.inject( pTarget, 'before');
            pTarget.setStyle('padding-top', 0);
            
        } else if( pPos == 'inside' ){
            pTarget.addClass('ka-pageTree-item-dragOver');
            
            this.loadChildsDelay = function(){
                this.openChilds( pTarget );
            }.delay(1000, this);
        }
    

        this.dropLastItem = pTarget;
    },
    
    cancelDragNDrop: function( pWithoutMoving ){
        
        
        if( this.lastClone ){
            this.lastClone.destroy();
            delete this.lastClone;
        }
        if( this.dropElement ){
            this.dropElement.destroy();
            delete this.dropElement;
        }
        if( this.dropLastItem ){
            this.dropLastItem.removeClass('ka-pageTree-item-dragOver');
            this.dropLastItem.setStyle('padding-bottom', 1);
            this.dropLastItem.setStyle('padding-top', 1);
            delete this.dropLastItem;
        }
        this.inDragMode = false;
        delete this.inDragModeA;

        
        if( pWithoutMoving != true ){
            
            var pos = {
                'before': 'up',
                'after': 'down',
                'inside': 'into'
            };

            var to = this.dragNDropElement.retrieve('item');
            var where = this.currentPageToDrag.retrieve('item');
            
            var whereRsn = where.rsn;
            var toRsn = to.rsn;
            var code = pos[this.dragNDropPos];
            
            var toDomain = to.domain?true:false;
            this.movePage( whereRsn, toRsn, code, toDomain );
        }
        document.removeEvent('mouseup', this.cancelDragNDrop.bind(this));
    },


    movePage: function( pWhereRsn, pToRsn, pCode, pToDomain ){
        var _this = this;
        var req = {
            rsn: pWhereRsn,
            torsn: pToRsn,
            mode: pCode,
            toDomain: pToDomain?1:0,
        };

        new Request.JSON({url: _path+'admin/pages/move', onComplete: function( res ){
            
            //target item this.dragNDropElement
            if( this.dragNDropElement.parent )
                this.reloadChilds( this.dragNDropElement );
            else
                this.dragNDropElement.pageTreeObj.reload();
            
            
            //origin item this.currentPageToDrag
            if( this.currentPageToDrag.parent )
                this.reloadChilds( this.currentPageToDrag.parent );
            else
                this.currentPageToDrag.pageTreeObj.reload();
    
            /*
            this.reload();
            var otherDomainPageTreeObj = this.dragNDropElement.pageTreeObj;
            if( otherDomainPageTreeObj != this )
                otherDomainPageTreeObj.loadFirstLevel();
            */
            
        }.bind(this)}).post(req);
    },

    reload: function(){
        this.loadFirstLevel();
    },
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
        
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    renderPages: function( pPages, pContainer ){
    
        if( !pPages ) return;
    
    
    },
    
    
    oldInit: function(){
        
        this.table = new Element('table', {
        	style: 'width: 100%',
        	cellpadding: 0,
        	cellspacing: 0
        }).inject(this.container);
        this.tbody = new Element('tbody').inject( this.table );
        this.tr = new Element('tr').inject( this.tbody );
        this.td = new Element('td').inject( this.tr );
        
        this.pane = new Element('div', {
            styles: {
                'padding-left': '15px',
                'margin-bottom': '4px',
                'border-bottom': '1px solid silver',
                'position': 'relative'
            }
        }).inject( this.td );
        
        
        if( this.container.getParent('div.treeContainer') )
        
        this.treeContainer = this.container.getParent('div.treeContainer');
        
        if( !this.treeContainer && this.container.get('class').contains('treeContainer') )
        	 this.treeContainer = this.container;
        
        if( this.treeContainer ){
        	this.treeContainer.addEvent('scroll', this.updateDomainBar.bind(this));
        	if( this.options.win )
        		this.options.win.addEvent('resize', this.updateDomainBar.bind(this));
        }

        this.loadTree();
    },
    
    prepareForScrolling: function(){

    	this.domainDiv = this.pane.getElement('div');
    	if( !this.domainDiv ) return;
    	
    	this.domainDiv.setStyle('background-image', 'url('+_path+'inc/template/admin/images/ka-pageTree-domainDynamicBg.png)');
    	this.domainDiv.setStyle('background-repeat', 'repeat-x');

    	this.domainDiv.setStyle('position', 'relative');
    	
    	this.pane.setStyle('padding-top', 20);
    	var size = this.pane.getSize();
    	
    	var additionalTop = 20;
    	if( this.pane.getStyle('height').toInt() == 1 )
    		additionalTop = 0;
    	
    	this.domainDiv.setStyle('top', (size.y*-1)+additionalTop);
    	
    	if( this.domainDiv.getNext() )
    		this.domainDiv.inject( this.domainDiv.getNext(), 'after' );
    	
    	this.updateDomainBar();
    },
    
    updateDomainBar: function(){

    	if( !this.treeContainer ) return;
    	if( !this.domainDiv ) return;
    	
    	var stop = this.treeContainer.scrollTop;
    	var pos = this.table.getPosition( this.treeContainer );
    	
    	var size = this.pane.getSize();
    	
    	var possibleTop = (pos.y-stop)*-1;
    	
    	var additionalTop = 25;
    	if( this.pane.getStyle('height').toInt() == 1 )
    		additionalTop = 0;
    	
    	if( possibleTop < size.y-38 && possibleTop >= 0 ){
    		
    		var mtop = ((size.y-possibleTop)*-1)+additionalTop;
    		this.domainDiv.setStyle('top', mtop);
    		
    	} else if( possibleTop < 0){
    		this.domainDiv.setStyle('top', (size.y*-1)+additionalTop);
    		
    	} else if( additionalTop == 0 ){
    		this.domainDiv.setStyle('top', -22);
    	}
    },

    loadTree: function(){
        var _this = this;
        
        this._pages = new Hash();
        var viewAllPages = 0;
        if( this.options.viewAllPages )
        	viewAllPages = 1;
        
        this.ready = false;
        
        new Request.JSON({url: _path+'admin/pages/getTree/?noCache='+(new Date().getTime()), onComplete: function(res){
            this._currentDomain = res.domain;
            this.oriPages = res.pages;
            
            if( this.options.select_rsn ){
                this.select( this.options.select_rsn );
            } else {
                this.render();
            }
            
            this.ready = true;
            this.fireEvent('ready');
            
        }.bind(this)}).post({ domain: _this.domainRsn, viewAllPages: viewAllPages });
    },
    
    isReady: function(){
    	return this.ready;
    },

    render: function(){
        this._pagesParent = new Hash();
        this._pages = new Hash();

        var _this = this;
        _this.pane.empty();

        if( this.oriPages ){/*
            this.oriPages.sort(function( a , b ){
                return 21;
            });*/
            this.oriPages.each(function(page){
                _this._pages.include( page.rsn, page );

                if(! _this._pagesParent.get( page.prsn ) )
                    _this._pagesParent.include( page.prsn, []);

                _this._pagesParent.get( page.prsn ).include( page );
            });
        }

        _this.domain = _this.createItem( _this._currentDomain, _this.pane, true );
        

        
        if( this.options.onReady ){
        	this.options.onReady();
        }
        
        this.isFirst = false;
        
        if( this.treeContainer ){
        	this.prepareForScrolling();
        }
        
    },

    hasChilds: function( pPage ){
        if( this._pagesParent.get( pPage.rsn ) )
            return true;
        return false;
    },

    renderChilds: function( pPage, pInject ){
        var _this = this;
        var pages = this._pagesParent.get( pPage.rsn );
        pages.sort(function(a,b){
            return a.sort-b.sort;
        });
        pages.each(function(item){
            _this.createItem( item, pInject );
        });
    },

    setOpen: function( pPageRsn, pIsOpen ){
        var opens = $H(window.kaPagesTreeOpens);
        //var opens = new Hash(JSON.decode(Cookie.read( 'pagesTreeOpens' )));
        opens.set( pPageRsn, pIsOpen );
        //Cookie.write( 'pagesTreeOpens', JSON.encode(opens), {duration: 365} );
        window.kaPagesTreeOpens = opens;
        this.updateDomainBar();
    },

    isOpen: function( pPageRsn ){
    	//var opens = new Hash(JSON.decode(Cookie.read( 'pagesTreeOpens' )));
        var opens = $H(window.kaPagesTreeOpens);
        var result = opens.get( pPageRsn );
        
        //is first openening and this.options.select_rsn is set ?
        if( this.jump2Page && this.options.select_rsn > 0 ){
            //search all parents of pPageRsn and compare
            
        	var page = this._pages.get( this.options.select_rsn );
        	
        	if( !page ) return result;
        	
            var parents = this._getParents( page );
            
            var treeKey = (page.domain_rsn+0==0)?'d_'+page.domain_rsn:page.rsn;
            	
            var checkId = pPageRsn;
            if( $type(pPageRsn) == 'string' && pPageRsn.substr(0,1) == 'd' ){
                checkId = 0;
            }
            
            if( parents.contains( checkId ) ) result = 1;
            
            //if( $type(pPageRsn) == 'string' && pPageRsn.substr(0,1) == 'd' ) result = 1;
            
            this.setOpen( pPageRsn, result );
        }
        
        return result; 
    },

    _getParents: function( pPage ){
        var found = false;
        var res = [0];
        var foundedPage = false;
        this._pages.each(function(item, rsn){
            if( pPage && item.rsn == pPage.prsn && found == false ){
                res.include( item.rsn );
                foundedPage = item;
                found = true;
            }
        });
        if( foundedPage != false )
            res.extend( this._getParents( foundedPage ) );
        return res;
    },

    isLast: function( pPage ){
        var lastItemRsn = 0;
        this._pagesParent.get( pPage.prsn ).each(function(item){
            lastItemRsn = item.rsn;
        });
        if( pPage.rsn == lastItemRsn )
            return true;
        return false;
    },

    /*createDrag: function( pTitle, pEvent ){
        
        var _this = this;
        this.currentPageToDrag = pTitle;

        if( this.lastClone )
            this.lastClone.destroy();

        var clone = pTitle.clone()
        .setStyles(pTitle.getCoordinates( this.container )) // this returns an object with left/top/bottom/right, so its perfect
        .setStyles({'opacity': 0.7, 'position': 'absolute', 'background-color': '#ddd',
            'background-image': 'none', 'margin-left': '1px', 'cursor': 'default', 'visibility': 'hidden'})
        .inject( this.container, 'top' );
        
        
        var st = _this.container.scrollTop.toInt();
        if( st > 0 )
            clone.setStyle('top', clone.getStyle('top').toInt()-st );
        
        this.lastClone = clone;

        this.currentDrag = pTitle;

        var drag = clone.makeDraggable( {
            container: this.container,
            snap: 0,
            onDrop: function( element, droppable ){
                _this.destroyDrag();
                
                if( _this.currentDropper ){
                	_this.currentDropper.getParent().setStyle( 'background-color', 'transparent' );
                    var elPage = _this.currentDropper.retrieve('page');
                    var drPage = pTitle.retrieve('page');
                    if( elPage.rsn != drPage.rsn ){
                        _this.createMoveContextMenu( pTitle, _this.currentDropper );
                    }
                }
            },
            onStart: function( el, drop){
            },
            onDrag: function( el, drop){
                el.setStyle('visibility', 'visible');
                var st = _this.container.scrollTop.toInt();
                if( st > 0 ){
                    el.setStyle('top', el.getStyle('top').toInt()+st );
                }
            },
            onCancel: function(){
                _this.destroyDrag();
            }
        });
        clone.addEvent( 'mouseup', function(){
            _this.destroyDrag();
        });
        drag.start( pEvent );
    },*/


    createMoveContextMenu: function( pWhere, pTo ){

        var pos = this.currentDropper.getPosition( this.container );
        var st = this.container.scrollTop.toInt();
        
        
        var _this = this;
        var t = pWhere.retrieve('page');
        pWhereRsn = t.rsn;

        var t = pTo.retrieve('page');
        var domain_rsn = 0;
        var actions = [
            {code: 'up', label: _('Above')},
            {code: 'into', label: _('Into')},
            {code: 'down', label:_('Below')}
        ];
        

        pToRsn = t.rsn;
        if( t.rsn == 0 ){
            //t.rsn = 'domain';
        	pToRsn = 'domain';
            domain_rsn = t.domain_rsn;
            var actions = [
                {code: 'into', label: _('Into')},
            ];
        }


        _this.createMoveContextMenuOver = true;
        
        var mtop = pos.y-15;
        if( mtop < 0 )
        	mtop = 1;
        
        var context = new Element( 'div', {
            'class': 'pagesTree-context-move'
        })
        .setStyles({
            left: pos.x+10,
            top: mtop,
            opacity: 0
        })
        .addEvent( 'mouseout', function(){
            _this.createMoveContextMenuOver = false;
            var __this = this;
            (function(){
                if(! _this.createMoveContextMenuOver )
                    __this.destroy();
            }).delay(500);
        })
        .inject( this.container );

        actions.each(function(item){
            new Element('a', {
                html: item.label,
                'class': item.code
            })
            .addEvent( 'click', function(){
                _this.movePage( pWhereRsn, pToRsn, item.code, domain_rsn );
                context.destroy();
            })
            .addEvent( 'mouseover', function(e){
                _this.createMoveContextMenuOver = true;
            })
            .inject( context );
        });

        context.set('tween', {duration: 200});
        context.tween( 'opacity', 1 );
        
    },

    destroyDrag: function(){
        if( this.lastClone )
            this.lastClone.destroy();
        this.currentDrag = false;
        this.currentPageToDrag = false;
    },

    /*unselect: function(){
        if( this.lastSelectedItem )
            this.lastSelectedItem.set('style',  'font-weight: normal; background-color: transparent;' );
        this.options.select_rsn = -1;
        this.lastSelectedItem = false;
        this.lastSelectedPage = false;
    },*/

    getSelected: function(){
        if( this.lastSelectedPage )
            return this.lastSelectedPage;
        return false;
    },

    select: function( pRsn ){
        this.options.select_rsn = pRsn;
        this.jump2Page = true;
        this.render();
        this.jump2Page = false;
    },

    openContext: function( pEvent, pSource, pPage, pDomain ){
        if( this.options.withContext != true ) return;
        if( this.oldContext ) this.oldContext.destroy();
        if(! pEvent.rightClick ) return;
        pEvent.stop();

        window.addEvent('click', function(){
            if( this.oldContext && pSource.getParent() ){
                pSource.getParent().getElement('span').getParent().set('class', 'title');
                this.oldContext.destroy();
            }
        }.bind(this));

        if( pDomain ){
            return;
        }

        pSource.getParent().getElement('span').getParent().set('class', 'title active');

        this.oldContext = new Element('div', {
            'class': 'ka-pagesTree-context'
        }).inject( document.body );

        var wsize = window.getSize();
        
        var left = pEvent.page.x - (this.container.getPosition(document.body).x);
        var mtop = pEvent.page.y - (this.container.getPosition(document.body).y);
        var left = pEvent.page.x;
        var mtop = pEvent.page.y;
        if( mtop < 0 )
        	mtop = 1;
        
        this.oldContext.setStyles({
            left: left,
            'top': mtop
        });

        if( pPage.type == 0 || pPage.type == 1 ){
            new Element('a', {
                html: _('Preview')
            })
            .addEvent('click', function(){
                if( this.options.pageObj )
                    this.options.pageObj.toPage( pPage );
            }.bind(this))
            .inject( this.oldContext );

        }

        var canDelete = true;
        
        if( !pDomain && !ka.checkPageAccess( pPage.rsn, 'deletePages' ) ){
        	canDelete = false;
        }
        
        if( canDelete ){
        	
            new Element('a', {
                'class': 'delimiter'
            }).inject( this.oldContext );
        	
	        new Element('a', {
	            html: _('Delete')
	        })
	        .addEvent('click', function(){
	            if( this.options.pageObj )
	                this.options.pageObj.deletePage( pPage );
	        }.bind(this))
	        .inject( this.oldContext );
    	}
    
        new Element('a', {
            'class': 'delimiter'
        }).inject( this.oldContext );

        new Element('a', {
            html: _('Copy')
        }).addEvent('click', function(){
            ka.setClipboard( ' \''+pPage.title+'\' '+_('page copied'), 'pageCopy', pPage );
        }.bind(this)).inject( this.oldContext );

        new Element('a', {
            html: _('Copy with subpages')
        }).addEvent('click', function(){
            ka.setClipboard( ' \''+pPage.title+'\' '+_('page with subpages copied'), 'pageCopyWithSubpages', pPage );
        }.bind(this)).inject( this.oldContext );

        
        var canPaste = true;
        if( !pPage.prsn ){
        	if( !ka.checkPageAccess( pPage.domain_rsn, 'addPages', 'd' ) ){
	        	canPaste = false;
	        }
        } else {
	        if( !ka.checkPageAccess( pPage.rsn, 'addPages' ) ){
	        	canPaste = false;
	        }
    	}
        
        if( canPaste ){
	        new Element('a', {
	            'class': 'delimiter'
	        }).inject( this.oldContext );
	
	        new Element('a', {
	            'class': 'noaction',
	            html: _('Paste')
	        }).inject( this.oldContext );
	
	        new Element('a', {
	            'class': 'indented',
	            html: _('up')
	        }).addEvent('click', function(){
	            this.paste('up', pPage);
	        }.bind(this)).inject( this.oldContext );
	
	        new Element('a', {
	            'class': 'indented',
	            html: _('into')
	        }).addEvent('click', function(){
	            this.paste('into', pPage);
	        }.bind(this)).inject( this.oldContext );
	
	        new Element('a', {
	            'class': 'indented',
	            html: _('below')
	        }).addEvent('click', function(){
	            this.paste('down', pPage);
	        }.bind(this)).inject( this.oldContext );
   		}
        
        var csize = this.oldContext.getSize();
        
        if( mtop+csize.y > wsize.y ){
        	mtop = mtop-csize.y;
        	this.oldContext.setStyle('top', mtop+1);
        }
        
        
    },

    paste: function( pPos, pPage ){
        var clipboard = ka.getClipboard();
        if( ! (clipboard.type == 'pageCopyWithSubpages' || clipboard.type == 'pageCopy') )
            return;

        var req = {};
        req.page = clipboard.value.rsn;

        req.to = pPage.rsn;
        req.pos = pPos;
        req.type = clipboard.type;

        new Request.JSON({url: _path+'admin/pages/paste', noCache: 1, async: false, onComplete: function(){
            this.reload();
        }.bind(this)}).post(req);
    
    },
    
    go2Page: function( pRsn ){
    
        
    
    },

    createItem: function( pPage, pInject, pDomain ){
        var _this = this;
        if( !pPage ) return;

        var item = new Element( 'div', {
            'class': 'pagesTree-pageItem'
        })
        .inject( pInject );
        
        if( pDomain ){
            pPage.type = '-1';
            pPage.title = pPage.domain;
            if( pPage.rsn != 0 )
            	pPage.domain_rsn = pPage.rsn;
            pPage.rsn = 0;
            item.setStyle('padding', '5px 0px');
            item.addClass('pagesTree-pageItemDomain');
        }

        item.store('item', pPage);
        
        var titlediv = new Element( 'div', {
            'class': 'title'
        }).inject( item );

        var title = new Element( 'span', {
            html: pPage.title,
            title: 'ID='+pPage.rsn
        }).inject( titlediv );

        if( pDomain && this.options.withPageAdd ){
        	
            if( ka.checkPageAccess( pPage.domain_rsn, 'addPages', 'd') ){
                new Element('img', {
		            src: _path+'inc/template/admin/images/icons/add.png',
		            title: _('Add new pages to this domain'),
		            style: 'cursor: pointer; top: 3px; left: -13px; position: absolute;'
		        })
		        .addEvent('click', function(){
		            _this.options.withPageAdd( pPage.domain_rsn );
		        })
	            .inject( item );
            }
        }


        if(! pDomain ){
            title
            .addEvent( 'click', function(){
                if( _this.options.onSelection )
                    _this.options.onSelection( pPage, title, pDomain );
                if( _this.options.onClick )
                    _this.options.onClick( pPage, title );
                _this.unselect();
                if( _this.options.noActive != true )
                    title.set('style',  'font-weight: bold; background-color: silver;' );
                _this.lastSelectedItem = title;
                _this.lastSelectedPage = pPage;
            })
            .addEvent( 'mouseup', function(){
                this.store( 'mousedown', false );
            });
            
            if( !this.options.noDrag ){

                title.addEvent( 'mousedown', function(e){
                	
                	if( e.rightClick ) return;
                	
                    if( !pDomain && !ka.checkPageAccess( pPage.rsn, 'movePages' ) ){
                    	return;
                    }
                	
                    title.store( 'mousedown', true );
                    if( _this.options.move != false ){
                        (function(){
                        if( title.retrieve('mousedown') ){
                            _this.createDrag( title, e );
                            title.focus();
                        }
                        }).delay(50)
                        e.stop();
                    }
                })
            }
            
        } else {
            title
            .set('title', 'ID='+pPage.domain_rsn)
            .addEvent('click', function(){
                if( _this.options.no_domain_select != true ){
                    if( _this.options.onDomainClick )
                        _this.options.onDomainClick( pPage, title );
                    if( _this.options.onSelection )
                        _this.options.onSelection( pPage, title, pDomain );
                    _this.unselect();
                    if( _this.options.noActive != true )
                        title.set('style',  'font-weight: bold; background-color: silver;' );
                    _this.lastSelectedItem = title;
                    _this.lastSelectedPage = pPage;
                }
            });
        }
        title
        .addEvent( 'mouseout', function(){
            this.store( 'mousedown', false );
            this.getParent().setStyle( 'background-color', 'transparent' );
            this.setStyle( 'cursor', 'pointer' );
            _this.currentDropper = false;
        })
        .addEvent( 'mousemove', function(){
            if( _this.currentDrag && _this.currentPageToDrag ){

            	var toPage = this.retrieve('page');
            	
                if( !toPage.prsn ){
	                if( !ka.checkPageAccess( toPage.domain_rsn, 'addPages', 'd' ) ){
	                	this.setStyle( 'cursor', 'url('+_path+'inc/template/admin/images/icons/stop.png)' );
	                	return;
	            	}
            	} else {
	                if( !ka.checkPageAccess( toPage.rsn, 'addPages' ) ){
	                	this.setStyle( 'cursor', 'url('+_path+'inc/template/admin/images/icons/stop.png)' );
	                	return;
	            	}
            	}

                var page = _this.currentPageToDrag.retrieve('page');
                if( page && page.rsn != pPage.rsn ){ 
                    this.getParent().setStyle( 'background-color', '#ddd' );
                    this.setStyle( 'cursor', 'crosshair' );
                    _this.currentDropper = title;
                }
            }
        });


        title.store( 'page', pPage );

        if( this.options.select_rsn && this.options.select_rsn == pPage.rsn ){
            title.set('style',  'font-weight: bold; background-color: silver;' );
            this.lastSelectedItem = title;
            this.lastSelectedPage = pPage;
        }

        var lastPage = (_this.options.select_rsn > -1) ? _this.options.select_rsn : (_this.lastSelectedPage)?_this.lastSelectedPage.rsn:-1;

        if( lastPage != -1 )
            if( lastPage == pPage.rsn ){
                _this.lastSelectedPage = pPage;
                _this.lastSelectedItem = title;
                if( _this.options.noActive != true  && !_this.options.no_domain_select)
                    title.set('style',  'font-weight: bold; background-color: silver;' );
                if( _this.options.onSelection )
                    _this.options.onSelection( pPage, title, pDomain );
            }


        //Type
        var types = new Hash({
            '0': 'page_green.png',
            '1': 'page_green.png',
            '2': 'folder.png',
            '3': 'page_white_text.png',
            '-1': 'world.png'
        });

        var type = new Element( 'img', {
            'class': 'type',
            src: _path+'inc/template/admin/images/icons/'+types[pPage.type]
        }).inject( item );


        var specialIcons = new Element( 'div', {
            'class': 'specialIcons'
        }).inject( item );
        specialIcons.addEvent('click', function(){
            title.fireEvent('click');
        });


        title.addEvent('mousedown', function(e){
            _this.openContext(e, this, pPage, pDomain );
        });
        
        specialIcons.addEvent('mousedown', function(e){
            _this.openContext(e, this, pPage, pDomain );
        });


        if( (pPage.type == 0 || pPage.type == 1) && pPage.visible == 0 ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/invisible.png'
            }).inject( specialIcons );
        }

        if( pPage.type == 1 ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/link.png'
            }).inject( specialIcons );
        }

        if( (pPage.type == 0 || pPage.type == 3) && pPage.draft_exist == 1){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/draft_exist.png'
            }).inject( specialIcons );
        }

        if( pPage.access_denied == 1 ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/access_denied.png'
            }).inject( specialIcons );
        }
        
        if( pPage.type == 0 && pPage.access_from_groups != "" && $type(pPage.access_from_groups) == 'string' ){
            new Element( 'img', {
                src: _path+'inc/template/admin/images/icons/pageMasks/access_group_limited.png'
            }).inject( specialIcons );
        }

        var isLast = (pDomain) ? true : this.isLast( pPage );
        if( isLast ){
            item.addClass( 'pagesTree-pageItemLast' );
        }
        
        var treeKey = (pDomain)?'d_'+pPage.domain_rsn:pPage.rsn;
        
        if( pDomain && this.options.openDomain ){
        	this.setOpen( treeKey, true );
        }

        if( this.hasChilds( pPage ) ){

            var toggle = new Element( 'img', {
                'class': 'toggle',
                src: _path+'inc/template/admin/images/icons/tree_minus.png'
            }).inject( item );

            var mypane = new Element('div', {
                'class': 'pagesTree-newLvL'
            }).inject( item, 'after' );
            if( isLast ){
                mypane.set( 'class', 'pagesTree-newLvL pagesTree-newLvLLast' );
            }

            toggle.addEvent( 'click', function(){
                var open = this.isOpen(treeKey);
                if(! open ){//wenn zu
                    mypane.setStyle( 'display', 'block' );
                    if( pDomain ){
                		this.pane.setStyle('height', 'auto');
                	}
                    toggle.set( 'src', _path+'inc/template/admin/images/icons/tree_minus.png');
                    this.setOpen( treeKey, true );
                } else {
                    mypane.setStyle( 'display', 'none' );
                    if( pDomain ){
                		this.pane.setStyle('height', 1);
                	}
                    toggle.set( 'src', _path+'inc/template/admin/images/icons/tree_plus.png');
                    this.setOpen( treeKey, false );
                }
            }.bind(this));

            //check ob in cookie gespeichert, ob dieser tree aufgeklappt ist
            if( this.isOpen(treeKey) ){ //false: zugeklappt
                mypane.setStyle( 'display', 'block' );
                if( pDomain ){
            		this.pane.setStyle('height', 'auto');
            	}
                toggle.set( 'src', _path+'inc/template/admin/images/icons/tree_minus.png');
            } else {
            	if( pDomain ){
            		this.pane.setStyle('height', 1);
            	}
                mypane.setStyle( 'display', 'none' );
                toggle.set( 'src', _path+'inc/template/admin/images/icons/tree_plus.png');
            }
            
            this.renderChilds( pPage, mypane );
            
	        if( this.isOpen(treeKey) && pDomain ){
	            this.updateDomainBar.delay(200, this);
	        }
        } else if( pDomain ){
    		this.pane.setStyle('height', 1);
        }
    }
});
