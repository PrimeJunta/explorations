/**
 * Wrapper for Google Drive Javascript API. Uses dojo/promise API to make it easier to use.
 */
define([ "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/Deferred",
         "dojo/dom-construct" ],
function( declare,
          lang,
          Deferred,
          domConstruct )
{
    return declare([], {
        /**
         * Your Google app client ID. Get it from Google Cloud Console.
         */
        clientId : "",
        /**
         * Your Google app API key, also from Google Cloud Console.
         */
        apiKey : "",
        /**
         * The scope is the Drive API.
         */
        SCOPES : "https://www.googleapis.com/auth/drive",
        /**
         * That's where it resides.
         */
        API_URL : "https://apis.google.com/js/client.js?onload=handleClientLoad",
        /**
         * Mix in kwObj, which presumably contains clientId and apiKey.
         */
        constructor : function( kwObj )
        {
            lang.mixin( this, kwObj );
        },
        /**
         * Starts up API if not already started. This continues directly with authorization check,
         * so don't do it unless you want the user to see that pop-up.
         * 
         * @public Deferred
         */
        startup : function()
        {
            var promise = new Deferred();
            if( window._googleDriveIsStarted )
            {
                promise.resolve();
            }
            else
            {
                window._googleDriveIsStarted = true;
                window.handleClientLoad = lang.hitch( this, this._handleClientLoad, promise );
                domConstruct.create( "script", { "type" : "text/javascript", "src" : this.API_URL }, document.body, "first" );
            }
            return promise;
        },
        /**
         * Check if the current user has authorized the application.
         * 
         * @public Deferred
         */
        checkAuthorization : function( promise, immediate )
        {
            if( !promise )
            {
                promise = new Deferred();
            }
            gapi.auth.authorize({
                "client_id": this.clientId,
                "scope": this.SCOPES,
                "immediate": immediate || false
            },
            lang.hitch( this, function( reslt ) {
                gapi.client.setApiKey( this.apiKey );
                gapi.client.load( "drive", "v2", lang.hitch( this, function()
                {
                    promise.resolve( reslt );
                }))
            }));
            return promise;
        },
        /**
         * Retrieve a list of File resources.
         *
         * @public Deferred
         */
        listFiles : function( /* Object */ kwObj )
        {
            kwObj = kwObj || {};
            var promise = new Deferred();
            var retrievePageOfFiles = function( request, result )
            {
                request.execute( function( resp )
                {
                    result = result.concat( resp.items );
                    var nextPageToken = resp.nextPageToken;
                    if( nextPageToken )
                    {
                        kwObj.pageToken = nextPageToken;
                        request = gapi.client.drive.files.list( kwObj );
                        retrievePageOfFiles( request, result );
                    }
                    else
                    {
                        result.sort( function( a, b ) {
                            if( a.modifiedDate < b.modifiedDate )
                            {
                                return 1;
                            }
                            else
                            {
                                return -1;
                            }
                        });
                        promise.resolve( result );
                    }
                });
            }
            var initialRequest = gapi.client.drive.files.list( kwObj );
            retrievePageOfFiles( initialRequest, [] );
            return promise;
        },
        /**
         * Download a file.
         * 
         * @public Deferred
         */
        getFileContent : function( /* DriveFile */ fileData )
        {
            var promise = new Deferred();
            downloadFile( fileData, lang.hitch( this, function( resp )
            {
                promise.resolve( resp );
            }));
            return promise;
        },
        /**
         * Looks for a file matching fileName. If present, downloads the newest and resolves with its content. Else resolves with false.
         * 
         * @public Deferred
         */
        downloadFileByName : function( fileName )
        {
            var promise = new Deferred();
            this.listFiles({ q : "title = '" + fileName + "'" }).then( lang.hitch( this, function( reslt ) {
                if( reslt[ 0 ] )
                {
                    this.downloadFile( reslt[ 0 ] ).then( lang.hitch( this, function( _reslt ) {
                        promise.resolve( _reslt );
                    }));
                }
                else
                {
                    promise.reject( "No matching file." );
                }
            }));
            return promise;
        },
        /**
         * Download a file"s content.
         *
         * @public Deferred
         */
        downloadFile : function( /* DriveFile */ fileData )
        {
            var promise = new Deferred();
            if( fileData.downloadUrl )
            {
                var accessToken = gapi.auth.getToken().access_token;
                var xhr = new XMLHttpRequest();
                xhr.open( "GET", fileData.downloadUrl );
                xhr.setRequestHeader( "Authorization", "Bearer " + accessToken );
                xhr.onload = function()
                {
                    promise.resolve( xhr.responseText );
                };
                xhr.onerror = function() {
                    console.log( xhr );
                    promise.reject( "XHR error." );
                };
                xhr.send();
            }
            else
            {
                promise.reject( "No download URL." );
            }
            return promise;
        },
        /**
         * Insert new file directly from input data.
         * 
         * @public Deferred
         */
        insertFile : function( /* Object */ fileData, /* String|byte[] */ contentData )
        {
            var promise = new Deferred();
            this._assertFileDataIsValid( fileData );
            const boundary = "-------314159265358979323846";
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            var base64Data = btoa( contentData );
            var multipartRequestBody =
                    delimiter +
                    "Content-Type: application/json\r\n\r\n" +
                    JSON.stringify( fileData ) +
                    delimiter +
                    "Content-Type: " + fileData.mimeType + "\r\n" +
                    "Content-Transfer-Encoding: base64\r\n" +
                    "\r\n" +
                    base64Data +
                    close_delim;

            var request = gapi.client.request({
                    "path": "/upload/drive/v2/files",
                    "method": "POST",
                    "params": {"uploadType": "multipart"},
                    "headers": {
                        "Content-Type": "multipart/mixed; boundary=\"" + boundary + "\""
                    },
                    "body": multipartRequestBody});
            request.execute( lang.hitch( this, function( file ) {
                promise.resolve( file );
            }));
            return promise;
        },
        /**
         * Updates file named inputData.title with contentData. If not present, inserts it. If more than one match is present,
         * updates the newest one.
         * 
         * @public Deferred
         */
        updateFileByName : function( /* Object */ inputData, /* String|byte[] */ contentData )
        {
            this._assertFileDataIsValid( inputData );
            var promise = new Deferred();
            this.listFiles({ q : "title = '" + inputData.title + "'" }).then( lang.hitch( this, function( reslt ) {
                if( !reslt[ 0 ] )
                {
                    console.log( "NO FILE PRESENT, INSERTING" );
                    this.insertFile( inputData, contentData ).then( lang.hitch( this, function( _reslt ) {
                        promise.resolve( _reslt );
                    }));
                }
                else
                {
                    console.log( "FILE IS PRESENT, UPDATING" );
                    this.updateFile( reslt[ 0 ].id, inputData, contentData ).then( lang.hitch( this, function( _reslt ) {
                        promise.resolve( _reslt );
                    }));
                }
            }));
            return promise;
        },
        /**
         * Look for a file matching fileData.title.  If one exists and its modifiedDate is newer than fileData.modifiedDate,
         * download it and resolve with "PLEASE_UPDATE", the metadata, and the content. Else updateFile on it with contentData,
         * and resolve with "SYNCED" and the metadata. Reads boolean "dirty" property from fileData to update a file if the 
         * modifyDate is the same on both. It will NOT modify the file on the server if it is newer, even if .dirty is set. 
         * Update, merge, and try again.
         * 
         * Usage: 
         *     this.syncFile({
         *         title : "myLittleFile.txt",
         *         mimeType : "text/plain",
         *         modifiedDate : "2013-10-27T22:35:54.865Z",
         *         dirty : "true"
         *     }, "My Little File Content." ).then( function( result ) {
         *         // do something with the result
         *     });
         * 
         * @public Deferred
         */
        syncFile : function( /* Object */ fileData, /* String|byte[] */ contentData )
        {
            console.log( "SYNC FILE", fileData, contentData );
            var dirty = fileData.dirty;
            delete fileData.dirty;
            this._assertFileDataIsValid( fileData );
            var promise = new Deferred();
            this.listFiles({ q: "title = '" + fileData.title + "'" }).then( lang.hitch( this, function( reslt ) {
                if( !reslt[ 0 ] )
                {
                    if( contentData )
                    {
                        console.log( "NO FILE PRESENT, CREATE AND RESOLVE AS CREATED" );
                        this.insertFile( fileData, contentData ).then( lang.hitch( this, function( _reslt ) {
                            promise.resolve({
                                "result" : "CREATED",
                                "fileData" : _reslt
                            });
                        }));
                    }
                    else
                    {
                        console.log( "NO FILE, NO CONTENT DATA, RESOLVE AS NOT_PRESENT" );
                        promise.resolve({
                            "result" : "NOT_PRESENT"
                        });
                    }
                }
                else
                {
                    if( !fileData.modifiedDate || reslt[ 0 ].modifiedDate > fileData.modifiedDate )
                    {
                        console.log( "IT'S NEWER, RETRIEVE AND RESOLVE AS PLEASE_UPDATE" )
                        this.downloadFile( reslt[ 0 ] ).then( lang.hitch( this, function( _reslt ) {
                            promise.resolve({
                                "result" : "PLEASE_UPDATE",
                                "fileData" : reslt[ 0 ],
                                "contentData" : _reslt
                            });
                        }));
                    }
                    else if( reslt[ 0 ].modifiedDate == fileData.modifiedDate && !dirty )
                    {
                        console.log( "THEY'RE THE SAME, RESOLVE AS UNCHANGED" );
                        promise.resolve({
                            "result" : "UNCHANGED",
                            "fileData" : reslt[ 0 ]
                        });
                    }
                    else
                    {
                        console.log( "IT'S OLDER OR DIRTY, UPDATE AND RESOLVE AS UPDATED" );
                        this.updateFile( reslt[ 0 ].id, fileData, contentData ).then( lang.hitch( this, function( _reslt ) {
                            promise.resolve({
                                "result" : "UPDATED",
                                "fileData" : _reslt
                            })
                        }));
                    }
                }
            }));
            return promise;
        },
        /**
         * Updates file fileId (read from a DriveFile) with metadata from fileData, and content from contentData.
         * 
         * @public Deferred
         */
        updateFile : function( /* String */ fileId, /* Object */ fileData, /* String|byte[] */ contentData )
        {
            var promise = new Deferred();
            this._assertFileDataIsValid( fileData );
            delete fileData.id;
            delete fileData.modifiedDate;
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            // Updating the metadata is optional and you can instead use the value from drive.files.get.
            var base64Data = btoa( contentData );
            var multipartRequestBody =
                  delimiter +
                  'Content-Type: application/json\r\n\r\n' +
                  JSON.stringify( fileData ) +
                  delimiter +
                  'Content-Type: ' + fileData.mimeType + '\r\n' +
                  'Content-Transfer-Encoding: base64\r\n' +
                  '\r\n' +
                  base64Data +
                  close_delim;

            var request = gapi.client.request({
                  'path': '/upload/drive/v2/files/' + fileId,
                  'method': 'PUT',
                  'params': {'uploadType': 'multipart', 'alt': 'json'},
                  'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                  },
                  'body': multipartRequestBody});
            request.execute( lang.hitch( this, function( file )
            {
                promise.resolve( file );
            }));
            return promise;
        },
        /**
         * Insert new file from File object (typically read from a File input.)
         * 
         * @public Deferred
         */
        insertFileFromFile : function( /* File */ fileData )
        {
            var promise = new Deferred();
            var reader = new FileReader();
            reader.readAsBinaryString( fileData );
            reader.onload = lang.hitch( this, function( e ) {
                var contentType = fileData.mimeType || "application/octet-stream";
                var inputData = {
                    "title": fileData.name,
                    "mimeType": contentType
                };
                this.insertFile( inputData, reader.result ).then( lang.hitch( this, function( file ) {
                    promise.resolve( file );
                }));
            });
            return promise;
        },
        /**
         * Called when the client library is loaded to start the auth flow. Sets timeout and continues
         * with checkAuthorization.
         * 
         * @private void
         */
        _handleClientLoad : function( /* Deferred */ promise )
        {
            window.setTimeout( lang.hitch( this, this.checkAuthorization, promise, true  ), 1 );
        },
        /**
         * Checks that fileData contains title and mimeType, the minimum we need to work with them.
         */
        _assertFileDataIsValid : function( /* Object */ fileData )
        {
            if( fileData.title && fileData.mimeType )
            {
                return true;
            }
            else
            {
                throw( new Error( "Invalid file data." ) );
            }
        }
    });
});