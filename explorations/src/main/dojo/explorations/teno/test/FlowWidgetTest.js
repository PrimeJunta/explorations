define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dijit/_WidgetBase",
         "dijit/_TemplatedMixin",
         "dijit/_WidgetsInTemplateMixin",
         "dijit/layout/BorderContainer",
         "dijit/layout/ContentPane",
         "../MultiColumnContainer",
         "dojo/text!./templates/FlowWidgetTest.html" ],
function( declare,
          lang,
          _WidgetBase,
          _TemplatedMixin, 
          _WidgetsInTemplateMixin,
          BorderContainer,
          ContentPane,
          MultiColumnContainer,
          template ) {
    return declare( [ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin ], {
        columns : 4,
        gutter : 10,
        templateString : template,
        iconSource : require.toUrl( "explorations/teno/test/themes/images/" ),
        setProperties : function()
        {
            this.columnWidget.columns = parseInt( this.columnsInput.value );
            this.columnWidget.gutter = parseInt( this.gutterInput.value );
            this.columnWidget.flow();
        }
    });
});