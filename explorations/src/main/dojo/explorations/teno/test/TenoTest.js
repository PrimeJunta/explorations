define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/dom-style",
         "dijit/_WidgetBase",
         "dijit/_TemplatedMixin",
         "../MultiColumnFlowController",
         "dojo/text!./templates/TenoTest.html" ],
function( declare,
          lang,
          domStyle,
          _WidgetBase,
          _TemplatedMixin, 
          MultiColumnFlowController,
          template ) {
    return declare( [ _WidgetBase, _TemplatedMixin, MultiColumnFlowController ], {
        templateString : template,
        lineHeight : 18,
        iconSource : require.toUrl( "explorations/teno/test/themes/images/" ),
        postCreate : function()
        {
            this.flow( this.htmlContent, [ this.leftColumn, this.centerLeftColumn, this.centerRightColumn, this.rightColumn ] );
        },
        increaseLineHeight : function()
        {
            this.lineHeight++;
            for( var i = 0; i < this.columnNodes.length; i++ )
            {
                domStyle.set( this.columnNodes[ i ], "lineHeight", "" + this.lineHeight + "px" );
            }
            this.flow();
        },
        decreaseLineHeight : function()
        {
            this.lineHeight--;
            for( var i = 0; i < this.columnNodes.length; i++ )
            {
                domStyle.set( this.columnNodes[ i ], "lineHeight", "" + this.lineHeight + "px" );
            }
            this.flow();
        }
    });
});