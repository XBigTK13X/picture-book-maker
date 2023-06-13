const LEFT_CLICK = 0
const RIGHT_CLICK = 2

const TARGET_WIDTH = 22

module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const _ = require('lodash')
        const Coordinates = require('../service/image-magick').Coordinates
        const settings = require('../../common/settings')
        const query = util.queryParams()
        query.sourceIndex = parseInt(query.sourceIndex, 10)
        const book = require('../data/book')
        const coordinates = require('../service/coordinates')

        let markup = `<img id="current-page" class="scanned-page" src="file://${query.image}" />`

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('current-image').innerHTML = markup
        document.getElementById('header').innerHTML = 'Page'

        //Without this, the loaded selection points won't display properly since the image width is still 0
        setTimeout(()=>{
            bookInfo = book.getInfo(query.sourceIndex, query.bookName)
            let selectionMarkup = ''
            let currentSelection = bookInfo.getSelection(query.image) || []
            const imageElement = $('#current-page')
            if(currentSelection.length > 0){
                for(let coord of currentSelection){
                    let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                    selectionMarkup += `
                    <div style="position: absolute;
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
                if(jQEvent.button === LEFT_CLICK){
                    if(currentSelection.length >= 4){
                        currentSelection = []
                        selectionMarkup = ''
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    const points = coordinates.windowToElement(jQEvent)
                    currentSelection.push({x: points.element.x, y: points.element.y})
                    selectionMarkup += `
                        <div style="position: absolute;
                                    left: ${points.window.x - TARGET_WIDTH}px;
                                    top: ${points.window.y - TARGET_WIDTH}px;
                                    opacity: 0.75;">
                            <img src="../asset/img/target.png"/>
                        </div>
                    `
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                    document.getElementById('selection-points').innerHTML = selectionMarkup
                }
                if(jQEvent.button === RIGHT_CLICK){
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
                    let selectionMarkup = ''
                    for(let coord of currentSelection){
                        const points = coordinates.elementToWindow(coord.x + mouseDeltaX, coord.y + mouseDeltaY, imageElement)
                        newSelection.push({
                            x: points.element.x,
                            y: points.element.y
                        })
                        selectionMarkup += `
                        <div style="position: absolute;
                                    left: ${points.window.x}px;
                                    top: ${points.window.y}px;
                                    opacity: 0.75;">
                            <img src="../asset/img/target.png"/>
                        </div>
                    `
                    }
                    currentSelection = newSelection
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                    document.getElementById('selection-points').innerHTML = selectionMarkup
                }
            }

            $('#current-page').on('mousedown', clickImage)
            $('#process-button').on('click', (jQEvent)=>{
                require('electron').ipcRenderer.send(
                    'pbm-process-book',
                    {
                        sourceIndex: query.sourceIndex,
                        bookName: query.bookName
                    }
                )
            })

            resolve()
        },100)
    })
}
