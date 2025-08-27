const LEFT_CLICK = 0
const MIDDLE_CLICK = 1
const RIGHT_CLICK = 2

const TARGET_WIDTH = 22

const BRACKET_LEFT = 219
const BRACKET_RIGHT = 221
const ENTER_KEY = 13
const EQUAL_KEY = 187

module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const query = util.queryParams()
        query.sourceIndex = parseInt(query.sourceIndex, 10)
        const book = require('../data/book')
        const coordinates = require('../service/coordinates')

        let markup = `<img id="current-page" class="scanned-page" src="file://${query.image}" />`

        document.getElementById('current-image').innerHTML = markup

        //Without this, the loaded selection points won't display properly since the image width is still 0
        setTimeout(()=>{
            let dragSelection = false
            const pages = book.getPages(query.sourceIndex, query.bookName)
            bookInfo = book.getInfo(query.sourceIndex, query.bookName)
            let doublePreviousPage = null
            let previousPage = null
            let nextPage = null
            let currentPage = null
            let sortIndex = bookInfo.getPage(query.image).sortIndex
            for(let ii = 0; ii < pages.length; ii++){
                const page = pages[ii]
                if(page === query.image){
                    if(pages.length > 2){
                        if(ii === 0){
                            doublePreviousPage = pages[pages.length - 2]
                        }
                        else if(ii === 1){
                            doublePreviousPage = pages[pages.length - 1]
                        }
                        else {
                            doublePreviousPage = pages[ii - 2]
                        }
                    }

                    if(ii === 0){
                        previousPage = pages[pages.length - 1]
                    } else {
                        previousPage = pages[ii - 1]
                    }
                    if(ii === pages.length - 1){
                        nextPage = pages[0]
                    }
                    else {
                        nextPage = pages[ii + 1]
                    }
                    currentPage = ii

                    break;
                }
            }
            $('#page-path').val(query.image)
            document.getElementById('header').innerHTML = `${query.bookName} | Page ${currentPage+1} of ${pages.length} | Index ${sortIndex}`
            bookInfo = book.getInfo(query.sourceIndex, query.bookName)
            let selectionMarkup = ''
            let currentSelection = bookInfo.getSelection(query.image) || []
            const imageElement = $('#current-page')
            if(currentSelection.length > 0){
                for(let coord of currentSelection){
                    let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                    selectionMarkup += `
                    <div style="pointer-events: none;
                                position: absolute;
                                left: ${translatedCoords.window.x - TARGET_WIDTH}px;
                                top: ${translatedCoords.window.y - TARGET_WIDTH}px;
                                opacity: 0.75;">
                        <img src="../asset/img/target.png"/>
                    </div>
                `
                }
                document.getElementById('selection-points').innerHTML = selectionMarkup
            }
            // TODO Resizing will not properly update the selection placement on screen, but the data will be correct
            const clickImage = (jQEvent)=>{
                // Left click to add a new point to the selection
                if(jQEvent.button === LEFT_CLICK){
                    if(currentSelection.length >= 4){
                        currentSelection = []
                        selectionMarkup = ''
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    else {
                        const points = coordinates.windowToElement(jQEvent)
                        currentSelection.push({x: points.element.x, y: points.element.y})
                        selectionMarkup += `
                            <div style="pointer-events: none;
                                        position: absolute;
                                        left: ${points.window.x - TARGET_WIDTH}px;
                                        top: ${points.window.y - TARGET_WIDTH}px;
                                        opacity: 0.75;">
                                <img src="../asset/img/target.png"/>
                            </div>
                        `
                        book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                }
                // Middle click to copy the previous page's selection
                if(jQEvent.button === MIDDLE_CLICK){
                    currentSelection = bookInfo.getSelection(previousPage) || []
                    selectionMarkup = ''
                    if(currentSelection.length > 0){
                        for(let coord of currentSelection){
                            let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                            selectionMarkup += `
                            <div style="pointer-events: none;
                                        position: absolute;
                                        left: ${translatedCoords.window.x - TARGET_WIDTH}px;
                                        top: ${translatedCoords.window.y - TARGET_WIDTH}px;
                                        opacity: 0.75;">
                                <img src="../asset/img/target.png"/>
                            </div>
                        `
                        }
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                }
                // Right click and drag to reposition all points of the selection
                if(jQEvent.button === RIGHT_CLICK){
                    dragSelection = true
                }
            }

            const unclickImage = (jQEvent)=>{
                if(jQEvent.button === RIGHT_CLICK){
                    dragSelection = false
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                }
            }

            const dragImage = (jQEvent)=>{
                if(dragSelection){
                    let centerX = 0
                    let centerY = 0
                    for(let coord of currentSelection){
                        centerX += coord.x
                        centerY += coord.y
                    }
                    centerX = centerX / currentSelection.length
                    centerY = centerY / currentSelection.length
                    const points = coordinates.windowToElement(jQEvent)
                    const mouseDeltaX = points.element.x - centerX
                    const mouseDeltaY = points.element.y - centerY
                    let newSelection = []
                    selectionMarkup = ''
                    for(let coord of currentSelection){
                        const points = coordinates.elementToWindow(coord.x + mouseDeltaX, coord.y + mouseDeltaY, imageElement)
                        newSelection.push({
                            x: points.element.x,
                            y: points.element.y
                        })
                        selectionMarkup += `
                        <div style="pointer-events: none;
                                    position: absolute;
                                    left: ${points.window.x - TARGET_WIDTH}px;
                                    top: ${points.window.y - TARGET_WIDTH}px;
                                    opacity: 0.75;">
                            <img src="../asset/img/target.png"/>
                        </div>
                    `
                    }
                    currentSelection = newSelection
                    document.getElementById('selection-points').innerHTML = selectionMarkup
                }
            }

            $('#current-page').on('mousedown', clickImage)
            $('#current-page').on('mouseup', unclickImage)
            $('#current-page').on('mousemove', dragImage)
            $(document).on('keydown', (jQEvent)=>{
                // Copy the selection points from the previous page
                if(jQEvent.which === ENTER_KEY){
                    currentSelection = bookInfo.getSelection(previousPage) || []
                    selectionMarkup = ''
                    if(currentSelection.length > 0){
                        for(let coord of currentSelection){
                            let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                            selectionMarkup += `
                            <div style="pointer-events: none;
                                        position: absolute;
                                        left: ${translatedCoords.window.x - TARGET_WIDTH}px;
                                        top: ${translatedCoords.window.y - TARGET_WIDTH}px;
                                        opacity: 0.75;">
                                <img src="../asset/img/target.png"/>
                            </div>
                        `
                        }
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                }
                // Copy the selection points from two pages ago
                if(jQEvent.which === EQUAL_KEY){
                    currentSelection = bookInfo.getSelection(doublePreviousPage) || []
                    selectionMarkup = ''
                    if(currentSelection.length > 0){
                        for(let coord of currentSelection){
                            let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                            selectionMarkup += `
                            <div style="pointer-events: none;
                                        position: absolute;
                                        left: ${translatedCoords.window.x - TARGET_WIDTH}px;
                                        top: ${translatedCoords.window.y - TARGET_WIDTH}px;
                                        opacity: 0.75;">
                                <img src="../asset/img/target.png"/>
                            </div>
                        `
                        }
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                }
                // Goto the previous page
                if(jQEvent.which === BRACKET_LEFT){
                    window.location.href = `page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${previousPage}`
                }
                // Goto the next page
                if(jQEvent.which === BRACKET_RIGHT){
                    window.location.href = `page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${nextPage}`
                }
            })
            $('#process-button').on('click', (jQEvent)=>{
                require('electron').ipcRenderer.send(
                    'pbm-process-book',
                    {
                        sourceIndex: query.sourceIndex,
                        bookName: query.bookName
                    }
                )
            })
            $('#hide-button').on('click', (jQEvent)=>{
                book.movePages(query.sourceIndex, query.bookName, '.hidden', [query.image])
                window.location.href = `page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${nextPage}`
            })
            $('#book-button').on('click', (jQEvent)=>{
                window.location.href = `book.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}`
            })
            resolve()
        },100)
    })
}
