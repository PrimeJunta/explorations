define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/dom-construct",
         "dojo/dom-geometry",
         "dojo/dom-class",
         "dojo/dom-style",
         "dojo/on",
         "dojo/topic",
         "dijit/registry",
         "dijit/layout/ContentPane",
         "dijit/_WidgetBase",
         "dijit/_Container",
         "dijit/layout/_ContentPaneResizeMixin",
         "./MultiColumnFlowController" ],
function( declare,
          lang,
          domConstruct,
          domGeometry,
          domClass,
          domStyle,
          on,
          topic,
          registry,
          ContentPane,
          _WidgetBase,
          _Container,
          _ContentPaneResizeMixin,
          MultiColumnFlowController)
{
    return declare([ _WidgetBase, _Container, _ContentPaneResizeMixin ], {
        columns : 2,
        gutter : 30,
        continuation : "",
        sourceNode : {},
        isContinuation : false,
        postMixInProperties : function()
        {
            this.inherited( arguments );
            this._events = [];
        },
        startup : function()
        {
            this.inherited( arguments );
            if( this.continuation && lang.isString( this.continuation ) )
            {
                this._events.push( topic.subscribe( "/ContinuationReady/" + this.continuation, lang.hitch( this, this.setupContinuation ) ) );
            }
            if( this.isContinuation )
            {
                topic.publish( "/ContinuationReady/" + this.id );
            }
            else
            {
                this.startFlow();
            }
        },
        setupContinuation : function()
        {
            this.continuation = registry.byId( this.continuation );
            this._continuationReady = true;
            if( this._continuationNodes )
            {
                this.continuation.continueFlow( this._continuationNodes );
                delete this._continuationNodes;
            }
        },
        startFlow : function()
        {
            this._setupSource();
            this._controller = new MultiColumnFlowController();
            this.flow();
        },
        flow : function()
        {
            this._setupColumns();
            var reslt = this._flow();
            if( this.continuation && reslt.result == "incomplete" )
            {
                this.flowIntoContinuation( reslt.overflow );
            }
        },
        flowIntoContinuation : function( nodes )
        {
            if( this._continuationReady )
            {
                this.continuation.continueFlow( nodes );
            }
            else
            {
                this._continuationNodes = nodes;
            }
        },
        continueFlow : function( nodes )
        {
            this.sourceNode = domConstruct.create( "div", {} );
            while( nodes.length > 0 )
            {
                this.sourceNode.appendChild( nodes.shift() );
            }
            this.startFlow();
        },
        _setupSource : function()
        {
            if( this._sourceNode )
            {
                domConstruct.empty( this._sourceNode );
            }
            else
            {
                this._sourceNode = domConstruct.create( "div", { style : "z-index:-1;position:absolute;top:0px;left:0px;width:100%;height:100%;visibility:hidden;" }, document.body );
            }
            if( !this.sourceNode.nodeType )
            {
                this.sourceNode = this.domNode;
            }
            while( this.sourceNode.childNodes.length > 0 )
            {
                this._sourceNode.appendChild( this.sourceNode.removeChild( this.sourceNode.firstChild ) );
            }
        },
        _setupColumns : function()
        {
            domConstruct.empty( this.containerNode );
            this._box = domGeometry.getContentBox( this.containerNode );
            var cWidth = ( this._box.w - this.gutter * ( this.columns - 1 ) ) / this.columns;
            this._columnNodes = [];
            for( var i = 0; i < this.columns; i++ )
            {
                var className = "multiColumnContentDiv";
                if( i == 0 )
                {
                    className += " multiColumnLeftColumn";
                }
                if( i == this.columns - 1 )
                {
                    className += " multiColumnRightColumn";
                }
                var _cc = domConstruct.create( "div", {
                    "class" : className,
                    "style" : "position:absolute;top:0px;height:100%;left:" + i * ( cWidth + this.gutter ) + "px;width:" + cWidth + "px;"
                }, this.containerNode );
                this._columnNodes.push( domConstruct.create( "div", { style : "padding:1px;" }, _cc ) ); // adding 1 px padding to deal with boundary condition
            }
        },
        _flow : function()
        {
            if( this._working )
            {
                this._waitToReflow(); // somebody resized the window while we were flowing, which means it'll be broken so we need to try again
                return;
            }
            this._working = true;
            var reslt = this._controller.flow( this._sourceNode, this._columnNodes );
            this._working = false;
            return reslt;
        },
        _waitToReflow : function()
        {
            if( this._rto )
            {
                clearTimeout( this._rto );
            }
            this._rto = setTimeout( lang.hitch( this, this._reflow ), 200 );
        },
        _reflow : function()
        {
            var box = domGeometry.getContentBox( this.containerNode );
            if( !this._box || box.w != this._box.w || box.h != this._box.h )
            {
                this._setupColumns();
                this._flow();
            }
        },
        resize : function()
        {
            this.inherited( arguments );
            this._waitToReflow();
        },
        destroy : function()
        {
            while( this._events.length > 0 )
            {
                this._events.pop().remove();
            }
            this.inherited( arguments );
        }
    });
});