define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/has",
         "dojo/dom-geometry",
         "dojo/dom-construct",
         "dojo/dom-style" ],
function( declare,
          lang,
          has,
          domGeometry,
          domConstruct,
          domStyle ) {
    return declare( [], {
        /**
         * Ordered list of nodes used as columns. We assume they have a fixed or otherwise limited size,
         * which will then cause overflow to flow between them.
         */
        columnNodes : [],
        /**
         * DOM node containing the source text to flow.
         */
        sourceNode : {},
        /**
         * Mixin keywords, e.g. columns and sourceNode.
         */
        constructor : function( /* Object */ kwObj )
        {
            lang.mixin( this, kwObj );
        },
        /**
         * Starts flow. If srcNode or colNodes are specified, they're put into .sourceNode and .columns;
         * else we're using values from them. Empty each node specified in .columns, preprocess the nodes
         * in srcNode, and _flow with the results. We also have a check for an exception thrown when
         * preprocessing images with computed widths. This only works on some browsers some of the time
         * and should be considered highly experimental.
         */
        flow : function( /* Element */ srcNode, /* Element[] */ colNodes )
        {
            if( srcNode )
            {
                this.sourceNode = srcNode;
            }
            if( colNodes )
            {
                this.columnNodes = colNodes;
            }
            for( var i = 0; i < this.columnNodes.length; i++ )
            {
                domConstruct.empty( this.columnNodes[ i ] );
            }
            var out = domConstruct.create( this.sourceNode.tagName, {});
            try
            {
                this._preprocessNodes( this.sourceNode.childNodes, out );
            }
            catch( e )
            {
                if( e.message == -1 ) // there was an image that hadn't finished loading so try again in a bit
                {
                    setTimeout( lang.hitch( this, this.flow, srcNode, colNodes ), 200 );
                    return;
                }
                else
                {
                    throw( e );
                }
            }
            this._flow( this._nodeListToArray( out.childNodes ), this._nodeListToArray( this.columnNodes ), [{ tagName : out.tagName, attributes : this._attributesToObject( out.attributes )}] );
        },
        /**
         * The loop which controls flow from column to column. We call _placeNode on srcNodes until
         * we get back something other than true, at which point we switch to the next column, and
         * repeat until we're either out of columns or out of nodes to place. The idea is that 
         * _placeNode returns either true (if the node fit), or a node containing anything that
         * didn't fit, so we can move that to the next column.
         */
        _flow : function( /* Node[] */ srcNodes, /* Element[] */ colNodes, /* Object[] */ wrappers )
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
         * The main recursion. We drill through to the bottom level of the DOM and place nodes
         * into destNode from that. Once they no longer fit, we create wrappers for what's left
         * by going through the wrappers stack, and return that.
         */
        _placeNode : function( /* Element */ srcNode, /* Element */ destNode, /* Element */ colNode, /* Object[] */ wrappers )
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
                return this._appendNode( srcNode, destNode, colNode, srcNode.tagName.toUpperCase() == "SPAN" ? true : false );
            }
        },
        /**
         * Utility method that puts all nodes in nodeList into an Array and returns it. We want this
         * because we will want to e.g. concatenate lists of nodes we're dealing with, and we can't
         * do that with nodeLists.
         */
        _nodeListToArray : function( /* NodeList */ nodeList )
        {
            var out = [];
            for( var i = 0; i < nodeList.length; i++ )
            {
                out.push( nodeList[ i ] );
            }
            return out;
        },
        /**
         * Injects node into destNode, checks that columnNode _hasRoom. If onlyText, places the text
         * content of node rather than the node itself. We do this to get rid of the <span> wrappers
         * we added in preprocessing. We need the spans because the browser might merge consecutive
         * text nodes into one, which would stop things from flowing.
         */
        _appendNode : function( /* Node */ node, /* Element */ destNode, /* Element */ columnNode, /* boolean */ onlyText )
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
        /**
         * If node has child elements (as opposed to text nodes etc.), returns true, else returns false.
         */
        _hasChildElems : function( /* Element */ node )
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
        /**
         * Drills down to text content level, and splits it into <span>s by word. If it hits image tags,
         * tries to check that the image has loaded.
         */
        _preprocessNodes : function( /* Node[] */ nodes, /* Element */ out )
        {
            for( var i = 0; i < nodes.length; i++ )
            {
                if( nodes[ i ].nodeType == 1 ) // element
                {
                    if( nodes[ i ].tagName.toUpperCase() == "IMG" || nodes[ i ].tagName.toUpperCase() == "IMAGE" )
                    {
                        this._assertImageHasLoaded( nodes[ i ] );
                    }
                    this._preprocessNodes( nodes[ i ].childNodes, domConstruct.place( this._copyElementWithAttrs( nodes[ i ] ), out ) );
                }
                else if( nodes[ i ].nodeType == 3 ) // text
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
        /**
         * Looks at the geometry of node and tries to guess if the image it contains has loaded. Unreliable.
         */
        _assertImageHasLoaded : function( /* Element */ node )
        {
            var cb = domGeometry.getContentBox( node );
            console.log( "ouch, image", cb );
            if( cb.h == 0 )
            {
                throw( new Error( -1 ) );
            }
            else if( has( "ff" ) )
            {
                if( cb.h == 16 && cb.w == 120 )
                {
                    throw( new Error( -1 ) );
                }
            }
        },
        /**
         * Creates a node with the same attributes as the argument node, and returns it.
         */
        _copyElementWithAttrs : function( /* Element */ node )
        {
            var _n = domConstruct.create( node.tagName, {} );
            for( var i = 0; i < node.attributes.length; i++ )
            {
                _n.setAttribute( node.attributes[ i ].name, node.attributes[ i ].value );
            }
            return _n;
        },
        /**
         * Utility method that converts a DOM attribute map to a keyword object.
         */
        _attributesToObject : function( /* NamedNodeMap */ attrs )
        {
            var out = {};
            for( var i = 0; i < attrs.length; i++ )
            {
                out[ attrs[ i ].name ] = attrs[ i ].value;
            }
            return out;
        },
        /**
         * Checks if node's margin box is bigger than node's parent's content box. If so, returns false,
         * else returns true.
         */
        _hasRoom : function( /* Node */ node )
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