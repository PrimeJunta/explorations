define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/dom-geometry",
         "dojo/dom-construct",
         "dojo/dom-style" ],
function( declare,
          lang,
          domGeometry,
          domConstruct,
          domStyle ) {
    return declare( [], {
        columns : [],
        sourceNode : {},
        constructor : function( kwObj )
        {
            lang.mixin( this, kwObj );
        },
        flow : function( srcNode, colNodes )
        {
            if( srcNode )
            {
                this.sourceNode = srcNode;
            }
            if( colNodes )
            {
                this.columns = colNodes;
            }
            for( var i = 0; i < this.columns.length; i++ )
            {
                domConstruct.empty( this.columns[ i ] );
            }
            var out = domConstruct.create( this.sourceNode.tagName, {});
            this._preprocessNodes( this.sourceNode.childNodes, out );
            this._flow( this._nodeListToArray( out.childNodes ), this._nodeListToArray( this.columns ), [{ tagName : out.tagName, attributes : this._attributesToObject( out.attributes )}] );
        },
        _flow : function( srcNodes, colNodes, wrappers )
        {
            var colNode = colNodes.shift();
            while( srcNodes.length > 0 )
            {
                var node = srcNodes.shift();
                var reslt = this._placeNode( node, colNode, colNode, wrappers );
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
        /**
         * Must return true or a Node.
         */
        _placeNode : function( srcNode, destNode, colNode, wrappers )
        {
            if( this._hasChildElems( srcNode ) )
            {
                // create wrapper for it
                var _wrapperNode = this._copyElementWithAttrs( srcNode ); // domConstruct.create( srcNode.tagName, {} );
                wrappers = wrappers.concat({ tagName : srcNode.tagName, attributes : this._attributesToObject( srcNode.attributes )});
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
                        var _reslt = this._placeNode( curNode, _wrapperNode, colNode, wrappers );
                        if( _reslt !== true )
                        {
                            // it didn't fit, so create a set of rootless wrappers and put it and rest of _cn in it, and return.
                            var _wd = wrappers.shift();
                            var _outWrapperNode = domConstruct.create( _wd.tagName, _wd.attributes );
                            var _outDestNode = _outWrapperNode;
                            while( wrappers.length > 0 )
                            {
                                _wd = wrappers.shift();
                                _outDestNode = domConstruct.create( _wd.tagName, _wd.attributes, _outDestNode );
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
                    this._preprocessNodes( nodes[ i ].childNodes, domConstruct.place( this._copyElementWithAttrs( nodes[ i ] ), out ) );
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
        _copyElementWithAttrs : function( node )
        {
            var _n = domConstruct.create( node.tagName, {} );
            for( var i = 0; i < node.attributes.length; i++ )
            {
                _n.setAttribute( node.attributes[ i ].name, node.attributes[ i ].value );
            }
            return _n;
        },
        _attributesToObject : function( attrs )
        {
            var out = {};
            for( var i = 0; i < attrs.length; i++ )
            {
                out[ attrs[ i ].name ] = attrs[ i ].value;
            }
            return out;
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