define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "ace/ace",
         "dijit/_WidgetBase",
         "dijit/_TemplatedMixin",
         "dojo/text!./templates/AceTest.html" ],
function( declare,
          lang,
          _ace,
          _WidgetBase,
          _TemplatedMixin,
          template )
{
    return declare([ _WidgetBase, _TemplatedMixin ], {
        templateString : template,
        postCreate : function()
        {
            var editor = window.ace.edit( "editor" );
            editor.setTheme( "ace/theme/monokai" );
            editor.getSession().setMode( "ace/mode/javascript" );
            console.log( "Editor is", editor );
            this.editor = editor;
        },
        logValue : function()
        {
            console.log( this.editor.getValue() );
        }
    });
});