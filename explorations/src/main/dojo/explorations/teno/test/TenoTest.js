define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/dom-geometry",
         "dojo/dom-construct",
         "dojo/dom-style",
         "dijit/_WidgetBase",
         "dijit/_TemplatedMixin",
         "dojo/text!./templates/TenoTest.html" ],
function( declare,
          lang,
          domGeometry,
          domConstruct,
          domStyle,
          _WidgetBase,
          _TemplatedMixin, 
          template ) {
    return declare( [ _WidgetBase, _TemplatedMixin ], {
        templateString : template,
        lineHeight : 18,
        postCreate : function()
        {
            this.columns = [ this.leftColumn, this.centerColumn, this.rightColumn ];
            this.flowMarkup( this.htmlContent );
        },
        flowMarkup : function( node )
        {
            for( var i = 0; i < this.columns.length; i++ )
            {
                domConstruct.empty( this.columns[ i ] );
            }
            var out = domConstruct.create( node.tagName, {});
            this._preprocessNodes( node.childNodes, out );
            this.flow( this._nodeListToArray( out.childNodes ), this._nodeListToArray( this.columns ), [ out.tagName ] );
        },
        flow : function( srcNodes, colNodes, wrapperTags )
        {
            var colNode = colNodes.shift();
            while( srcNodes.length > 0 )
            {
                var node = srcNodes.shift();
                var reslt = this._placeNode( node, colNode, colNode, wrapperTags );
                if( reslt !== true ) // some or all didn't fit
                {
                    srcNodes = [ reslt ].concat( srcNodes );
                    colNode = colNodes.shift();
                    if( !colNode ) // we're out of columns
                    {
                        console.log( "Out of columns" );
                        return;
                    }
                }
            }
        },
        increaseLineHeight : function()
        {
            this.lineHeight++;
            for( var i = 0; i < this.columns.length; i++ )
            {
                domStyle.set( this.columns[ i ], "lineHeight", "" + this.lineHeight + "px" );
            }
            this.flowMarkup( this.htmlContent );
        },
        decreaseLineHeight : function()
        {
            this.lineHeight--;
            for( var i = 0; i < this.columns.length; i++ )
            {
                domStyle.set( this.columns[ i ], "lineHeight", "" + this.lineHeight + "px" );
            }
            this.flowMarkup( this.htmlContent );
        },
        /**
         * Must return true or a Node.
         */
        _placeNode : function( srcNode, destNode, colNode, wrapperTags )
        {
            if( this._hasChildElems( srcNode ) )
            {
                // create wrapper for it
                var _wrapperNode = this._cloneElementWithAttrs( srcNode ); // domConstruct.create( srcNode.tagName, {} );
                wrapperTags = wrapperTags.concat( srcNode.tagName );
                if( this._appendNode( _wrapperNode, destNode, colNode ) !== true )
                {
                    // no room for even the wrapper, so return srcNode
                    return srcNode;
                }
                else
                {
                    // now _wrapperNode is in destNode, so let's recurse
                    var _cn = this._nodeListToArray( srcNode.childNodes );
                    while( _cn.length > 0 )
                    {
                        var curNode = _cn.shift();
                        var _reslt = this._placeNode( curNode, _wrapperNode, colNode, wrapperTags );
                        if( _reslt !== true )
                        {
                            // it didn't fit, so create a set of rootless wrappers and put it and rest of _cn in it, and return.
                            var _outWrapperNode = domConstruct.create( wrapperTags.shift(), {} );
                            var _outDestNode = _outWrapperNode;
                            while( wrapperTags.length > 0 )
                            {
                                _outDestNode = domConstruct.create( wrapperTags.shift(), {}, _outDestNode );
                            }
                            _outDestNode.appendChild( curNode );
                            while( _cn.length > 0 )
                            {
                                _outDestNode.appendChild( _cn.shift() );
                            }
                            return _outDestNode;
                        }
                    }
                    return true; // loop completed
                }
            }
            else
            {
                return this._appendNode( srcNode, destNode, colNode, true );
            }
        },
        _nodeListToArray : function( nodeList )
        {
            var out = [];
            for( var i = 0; i < nodeList.length; i++ )
            {
                out.push( nodeList[ i ] );
            }
            return out;
        },
        _appendNode : function( node, destNode, columnNode, onlyText )
        {
            var _n = onlyText ? document.createTextNode( node.textContent ) : node;
            destNode.appendChild( _n );
            if( this._hasRoom( columnNode ) )
            {
                return true;
            }
            else
            {
                destNode.removeChild( _n );
                return node;
            }
        },
        _hasChildElems : function( node )
        {
            for( var i = 0; i < node.childNodes.length; i++ )
            {
                if( node.childNodes[ i ].nodeType == 1 )
                {
                    return true;
                }
            }
            return false;
        },
        _preprocessNodes : function( nodes, out )
        {
            for( var i = 0; i < nodes.length; i++ )
            {
                if( nodes[ i ].nodeType == 1 )
                {
                    this._preprocessNodes( nodes[ i ].childNodes, domConstruct.place( this._cloneElementWithAttrs( nodes[ i ] ), out ) );
                }
                else if( nodes[ i ].nodeType == 3 )
                {
                    var txt = "" + nodes[ i ].textContent;
                    txt = txt.replace( /\s+/g, " " );
                    var spts = txt.split( " " );
                    for( var s = 0; s < spts.length; s++ )
                    {
                        if( spts[ s ] != "" )
                        {
                            domConstruct.create( "span", { innerHTML : spts[ s ] + " " }, out );
                        }
                    }
                }
            }
            return out;
        },
        _cloneElementWithAttrs : function( node )
        {
            var _n = domConstruct.create( node.tagName, {} );
            for( var i = 0; i < node.attributes.length; i++ )
            {
                _n.setAttribute( node.attributes[ i ].name, node.attributes[ i ].value );
            }
            return _n;
        },
        _hasRoom : function( node )
        {
            var cBox = domGeometry.getMarginBox( node );
            var mBox = domGeometry.getContentBox( node.parentNode );
            if( mBox.h > cBox.h )
            {
                return true;
            }
            else
            {
                return false;
            }
        }
    });
});