# BoundHTMLElement

The BoundHTMLElement is a simple utility class to assist in rapidly developing webcomponents by providing data binding. It is intended to remain small (about 3KB minified), have zero dependencies, work quickly while minimizing DOM interaction, and have no opinions or implications on your markup or design.

## Caveats/Browser Support

In this version, browser support is limited to modern versions of Chrome, Firefox, and Safari. Polyfills for custom elements, the hidden property, promises, and importNode will be needed for older browsers. 

## Usage Example

BoundHTMLElement is intended to be extended by a custom element:

```javascript
class CustomElement extends BoundHTMLElement {
    constructor() {
        super()
        // getUser() used here as a stand-in for getting data from some other service
        getUser().then(user => {
            this.user = user
        })
    }
}
customElements.define('custom-element', CustomElement)
```

Once you have defined your custom element and you have some data, you just assign the data to "this." From there, the BoundHTMLElement looks for bindings in the HTML and assigns the data accordingly:

```html
<div bind-model="user">
    <p bind-append="name">Hello, </p>
    <p>You last logged in <span bind-value="lastDate"></span></p>
    <div bind-replace="bio"></div>
    <ul>
        <li bind-repeat="events" bind-value="message"></li>
    </ul>
</div>
```

If we suppose that the getUser() function returns data like this:

```json
{
    "name": "FirstName",
    "lastDate": "08/22/1995",
    "bio": "<p>An HTML biography</p>",
    "events": [{
        "message": "You logged in"
    }, {
        "message": "You logged out"
    }]
}
```

Then the BoundHTMLElement will fill in the data such that you get HTML output like this:

```html
<div bind-model="user">
    <p bind-append="name">Hello, FirstName</p>
    <p>You last logged in <span bind-value="lastDate">08/22/1995</span></p>
    <p>An HTML biography</p>
    <ul>
        <li>You logged in</li>
        <li>You logged out</li>
    </ul>
</div>
```

## Detailed Usage

### Binding Attributes

The following HTML elements trigger actions:

* bind-append: Add data to the end of an element, after other content
* bind-replace: Completely replace the entire element with the given value
* bind-value: Replace content inside the element with a value
* bind-model: Changes the context of the HTML inside, such that any bound values will refer to the values of an object
* bind-repeat: Repeats the given element once for every item in an array

Bindings happen ONLY when the element is first loaded. If you try to dynamically add new bindings after the element has loaded, it will not work automatically. See the "bindElements" utility function.

### Utility functions

From within your custom element, you can use:

* ready(): Returns a promise that resolves when the DOM is loaded. Just a handy way to always be sure the DOM has loaded. Note that values you add to the element will automatically be resolved after the DOM has loaded, so you don't need to wrap standard code with this.

* bindElements(element, obj): Scans a given element and child elements for binding attributes, and binds them to the given object.

## But Why?

An attempt to serve a fairly narrow use case: You like vanilla Javascript webcomponents, and you would like to make them reusable such that you can reuse them with any HTML structure or design.