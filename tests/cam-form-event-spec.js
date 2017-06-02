'use strict';

var nock = require('nock');
var jsdom = require('jsdom');
var path = require('path');

var document = null;
var window = null;

var tempSchemaUrl = 'http://localhost:8080/schemas/contact-form.json';
var schema404Url = 'http://localhost:8080/404';

// intercept request for schema
nock.disableNetConnect();

describe('pure-form events', function () {

    // create a new browser instance before each test
    beforeEach(function (done) {

        nock('http://localhost:8080')
            .get('/polyfills/document-register-element.js')
            .replyWithFile(200, path.resolve('./polyfills/document-register-element.js'))
            .get('/src/pure-form.js')
            .replyWithFile(200, path.resolve('./src/pure-form.js'))
            .get('/schemas/contact-form.json')
            .query(true)
            .replyWithFile(200, path.resolve('./schemas/contact-form.json'))
            .get('/404')
            .reply(404);

        var virtualConsole = new jsdom.VirtualConsole();

        var options = {
            url: 'http://localhost:8080',
            contentType: 'text/html',
            runScripts: 'dangerously',
            resources: 'usable',
            virtualConsole: virtualConsole.sendTo(console) // redirect browser output to terminal
        };

        // load test page from disk (includes links to dependent scripts)
        jsdom.JSDOM.fromFile(path.resolve(__dirname, 'test-page.html'), options).then(function(dom) {

            // expose the window/document object to tests
            window = dom.window;
            document = window.document;

            // slight wait to allow scripts to load
            setTimeout(function() {
                expect(document).toBeDefined();
                expect(document.title).toBe('Pure Form: Test Page');
                expect(document.registerElement).toBeDefined();
                done();
            }, 250);
        });
    });

    it('should fire schema-loaded event when schema loaded', function(done) {

        var el = document.createElement('pure-form');

        el.addEventListener('schema-loaded', function(e) {
            expect(e).toBeDefined();
            expect(e.target).toEqual(el);
            expect(e.detail).toEqual(tempSchemaUrl);
            expect(this).toEqual(el);
            expect(el.schema).toBeDefined();
            expect(el.schema.id).toEqual('contact-form');
            done();
        });

        el.src = tempSchemaUrl;
    });

    it('should fire schema-errored event when schema fails to load', function(done) {

        var el = document.createElement('pure-form');

        el.addEventListener('schema-errored', function(e) {
            expect(e).toBeDefined();
            expect(e.target).toEqual(el);
            expect(e.detail).toEqual(schema404Url);
            expect(el.schema).toBe(null);
            done();
        });

        el.src = schema404Url;
    });

    it('should fire render-complete once rendering has complete', function(done) {

        var el = document.createElement('pure-form');

        el.addEventListener('render-complete', function(e) {

            var form = el.querySelector('.pure-form-form');
            var labels = el.querySelectorAll('.pure-form-label');

            expect(e).toBeDefined();
            expect(e.target).toEqual(el);
            expect(e.detail).toBeUndefined();
            expect(this).toEqual(el);
            expect(form).toBeDefined();
            expect(form.tagName).toEqual('FORM');
            expect(labels.length).toBeGreaterThan(0);
            done();
        });

        el.src = tempSchemaUrl;
    });

    it('should fire button-clicked event when button clicked', function(done) {

        var el = document.createElement('pure-form');
        var buttonLabel = 'Random' + (new Date()).getTime();

        el.buttons = buttonLabel;

        el.addEventListener('button-clicked', function(e) {
            expect(e).toBeDefined();
            expect(e.target).toEqual(el);
            expect(e.detail).toEqual(buttonLabel);
            expect(this).toEqual(el);
            expect(e).toBeDefined();
            done();
        });

        el.addEventListener('render-complete', function() {

            // grab a button
            var button = el.querySelector('input[type="submit"]');

            expect(button).toBeDefined();

            // fire click event
            var clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            button.dispatchEvent(clickEvent);
        });

        el.src = tempSchemaUrl;
    });

});