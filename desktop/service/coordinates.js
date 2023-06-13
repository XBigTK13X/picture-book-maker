const windowToElement = (jQEvent)=>{
    const element = $(jQEvent.target)
    const clickedX = jQEvent.pageX - element.offset().left
    const clickedY = jQEvent.pageY - element.offset().top
    const ratioX = clickedX / element.width()
    const ratioY = clickedY / element.height()
    const docElement = document.getElementById(element.attr("id"))
    const elementX = ratioX * docElement.naturalWidth
    const elementY = ratioY * docElement.naturalHeight
    return {
        element: {
            x: elementX,
            y: elementY,
        },
        window: {
            x: jQEvent.pageX,
            y: jQEvent.pageY
        }
    }
}

const elementToWindow = (x, y, jQElement)=>{
    const docElement = document.getElementById(jQElement.attr("id"))
    const ratioX = x / docElement.naturalWidth
    const ratioY = y / docElement.naturalHeight
    const clickedX = ratioX * jQElement.width()
    const clickedY = ratioY * jQElement.height()
    const windowX = clickedX + jQElement.offset().left
    const windowY = clickedY + jQElement.offset().top
    return {
        element: {
            x,
            y
        },
        window: {
            x: windowX,
            y: windowY
        }
    }
}

module.exports = {
    windowToElement,
    elementToWindow
}