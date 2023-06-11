module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const _ = require('lodash')
        const Coordinates = require('../service/image-magick').Coordinates
        const settings = require('../../common/settings')
        const query = util.queryParams()
        const workspace = require('../service/workspace')
        let markup = `<img id="current-page" class="scanned-page" src="file://${query.image}" />`

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('current-image').innerHTML = markup
        document.getElementById('header').innerHTML = 'Page'

        let currentSelection = []
        let selectionMarkup = ''
        // TODO This will break the display, but not image magick call, on window resize
        const addToSelection = (jQEvent)=>{
            if(currentSelection.length < 4){
                const element = $(jQEvent.target)
                const clickedX = jQEvent.pageX - element.offset().left
                const clickedY = jQEvent.pageY - element.offset().top
                const ratioX = clickedX / element.width()
                const ratioY = clickedY / element.height()
                const targetSize = 22;
                const pointX = jQEvent.pageX - targetSize
                const pointY = jQEvent.pageY - targetSize
                const documentImage = document.getElementById(element.attr("id"))
                currentSelection.push({x: Math.floor(ratioX * documentImage.naturalWidth), y: Math.floor(ratioY * documentImage.naturalHeight)})
                selectionMarkup += `
                    <div style="position: absolute;
                                left: ${pointX}px;
                                top: ${pointY}px;
                                opacity: 0.75;">
                        <img src="../asset/img/target.png"/>
                    </div>
                `
                document.getElementById('selection-points').innerHTML = selectionMarkup
            }
        }

        console.log("Building data dir"+query.bookName)
        workspace.prepDir(query.bookName)

        $('#current-page').on('click', addToSelection)
        $('#crop-button').on('mousedown', (jQEvent)=>{
            console.log({button:jQEvent.button})
            const self = $(jQEvent.target)
            const coordinates = new Coordinates()
            coordinates.fromXYPairs(currentSelection)
            require('electron').ipcRenderer.send(
                'pbm-im-distort-and-crop',
                {
                    inputFilePath: query.image,
                    selectionCoordinates: coordinates
                }
            )
        })

        resolve()
    })
}
