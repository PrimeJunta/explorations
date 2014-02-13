define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "codemirror/lib/codemirror",
         "dijit/_WidgetBase",
         "dijit/_TemplatedMixin",
         "dojo/text!./templates/CodeMirrorTest.html" ],
function( declare,
          lang,
          codemirror,
          _WidgetBase,
          _TemplatedMixin,
          template )
{
    return declare([ _WidgetBase, _TemplatedMixin ], {
        templateString : template,
        postCreate : function()
        {
            require([ "codemirror/mode/javascript/javascript" ], lang.hitch( this, function( cmjs )
            {
                this.editor = window.CodeMirror.fromTextArea( this.editorTextArea, {
                    mode: "javascript",
                    theme: "rubyblue",
                    value: this.editorTextArea.value
                });
                this.editor.refresh();
            }));
        }
    });
});