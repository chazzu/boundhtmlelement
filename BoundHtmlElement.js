class BoundHtmlElement extends HTMLElement {
    constructor() {
        super()
        this.boundProperties = {}
        this.ready().then(_ => this.bindElements(this, this))
    }

    bindElement(element, valObj) {
        if (!valObj.boundProperties)
            valObj.boundProperties = {}
        element.getAttributeNames()
        .filter(attr => attr.startsWith('bind-'))
        .forEach(attr => {
            let type = attr.substring('bind-'.length, attr.length)
            let property = element.getAttribute(attr)
            if (!['replace', 'value', 'append'].includes(type))
                return
            this.bindProperty(property, element, valObj, type)
        })
    }

    bindElements(parent, valObj) {
        Array.prototype.slice.call(parent.querySelectorAll('[bind-replace],[bind-value],[bind-append]'))
            .filter(element => !this.insideRepeatOrModel(element, parent))
            .forEach(element => this.bindElement(element, valObj))
        parent.querySelectorAll('[bind-repeat]')
            .forEach(element => this.bindRepeat(element, valObj))
        Array.prototype.slice.call(parent.querySelectorAll('[bind-model]'))
            .filter(element => element !== parent)
            .forEach(element => this.bindModel(element, valObj))
    }

    bindModel(element, valObj) {
        let value = {},
            property = element.getAttribute('bind-model')

        if (valObj[property])
            value = valObj[property]
    
        if (!(property in valObj.boundProperties)) {
            valObj.boundProperties[property] = []
            Object.defineProperty(valObj, property, {
                enumerable: true,
                configurable: false,
                get: () => {
                    return value
                },
                set: (newValue) => {
                    Object.keys(value).forEach(key => {
                        if (!(key in newValue)) {
                            value[key] = ''
                            if (element instanceof BoundHtmlElement)
                                element[key] = ''
                        }
                    })
                    Object.keys(newValue).forEach(key => {
                        value[key] = newValue[key]
                        if (element instanceof BoundHtmlElement)
                            element[key] = newValue[key]
                    })
                }
            })
        }

        valObj.boundProperties[property].push({ 
            el: element
        })

        value.boundProperties = []
        if (!(element instanceof BoundHtmlElement)) {
            this.bindElements(element, value)
        }
    }

    bindProperty(property, element, valObj, type) {
        let value = null

        if (valObj[property])
            value = valObj[property]

        if (!(property in valObj.boundProperties)) {
            valObj.boundProperties[property] = []
            Object.defineProperty(valObj, property, {
                enumerable: true,
                configurable: false,
                get: () => {
                    return value
                },
                set: (newValue) => {
                    value = newValue
                    this.updateProperty(property, value, valObj)
                }
            })
        }

        valObj.boundProperties[property].push({ 
            fn: 'updateBound' + type.charAt(0).toUpperCase() + type.slice(1),
            el: element
        })

        if (value)
            this.updateProperty(property, value, valObj)
    }

    bindRepeat(element, valObj) {
        let value = [],
            property = element.getAttribute('bind-repeat')
        if (Array.isArray(valObj[property]))
            value = valObj[property]

        element.hidden = true

        if (!(property in valObj.boundProperties)) {
            valObj.boundProperties[property] = []
            Object.defineProperty(valObj, property, {
                enumerable: true,
                configurable: false,
                get: () => {
                    return value
                },
                set: (newValue) => {
                    value = newValue
                    this.bindRepeatArr(element, value)
                    this.updateRepeat(valObj.boundProperties[property], value)
                }
            })
        }

        valObj.boundProperties[property].push({ type: 'repeat', el: element, tpl: element, els: [] })
        this.updateRepeat(valObj.boundProperties[property], value)
        this.bindRepeatArr(valObj.boundProperties[property], value)
    }

    bindRepeatArr(bound, arr) {
        ['pop','push','reverse','shift','unshift','splice','sort'].forEach(operation =>{
            let fn = arr[operation],
                context = this
            Object.defineProperty(arr, operation, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: function() { // We must change scope in order to get valid arguments
                    fn.apply(arr, arguments)
                    context.updateRepeat(bound, arr)
                }
            })
        })
    }

    insideRepeatOrModel(element, grandparent) {
        let parent = element.parentElement

        while (parent.parentElement !== null && parent !== grandparent) {
            let attributes = parent.getAttributeNames()
            if (parent instanceof BoundHtmlElement || attributes.includes('bind-repeat') || attributes.includes('bind-model'))
                return true
            parent = parent.parentElement
        }
        return false
    }

    ready() {
        return new Promise(resolve => {
            if (document.readyState === 'complete')
                return resolve()
            document.addEventListener('DOMContentLoaded', e => {
                return resolve()
            })
        })
    }

    updateBoundAppend(bound, value) {
        if (bound.el instanceof HTMLInputElement)
            bound.el.value += value
        else
            bound.el.innerText += value
    }

    updateBoundReplace(bound, value) {
        if (!(value instanceof HTMLElement)) {
            let template = document.createElement('template')
            template.innerHTML = value.trim()
            value = template.content.firstChild
        }

        bound.el.replaceWith(value)
        bound.el = value
    }

    updateBoundValue(bound, value) {
        if (bound.el instanceof HTMLInputElement)
            bound.el.value = value
        else
            bound.el.innerText = value
    }
    
    updateProperty(property, value, valObj) {
        if (!(property in valObj.boundProperties))
            return

        valObj.boundProperties[property].forEach(bound => {
            if (typeof this[bound.fn] !== 'function')
                return
            this[bound.fn](bound, value)
        })
    }

    updateRepeat(bounds, arr) {
        bounds.forEach(bound => {
            arr.forEach((value, idx) => {
                if (idx in bound.els) {
                    // This index is already built; reuse the existing DOM element
                    let newEl = bound.els[idx]
                    this.bindElement(newEl, value)
                    this.bindElements(newEl, value)
                    newEl.hidden = false
                } else {
                    let newEl = document.importNode(bound.tpl, true)
                    newEl.removeAttribute('bind-repeat')

                    if (typeof value === 'object') {
                        this.bindElement(newEl, value)
                        this.bindElements(newEl, value)
                    }

                    newEl.hidden = false
                    if (bound.els.length > 0)
                        bound.els[bound.els.length-1].after(newEl)
                    else
                        bound.el.after(newEl)
                    bound.els.push(newEl)
                }
            })
            
            if (bound.els.length > arr.length) {
                for (let idx = arr.length; idx < bound.els.length; idx++) {
                    // We already added this in, let's hide it and reuse later if necessary
                    bound.els[idx].hidden = true
                }
            }
        })
    }
}

export default BoundHtmlElement