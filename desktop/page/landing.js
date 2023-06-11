module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const _ = require('lodash')
        const Coordinates = require('../service/image-magick').Coordinates
        const settings = require('../../common/settings')
        let markup = '<a href="page.html?sourceIndex=0&bookName=snaps&image=E:\\media\\book\\raw\\shopped\\CameraSnaps\\snaps\\PXL_20230608_144149693.jpg">Debug Page</a>'

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('content').innerHTML = markup
        document.getElementById('header').innerHTML = 'Picture Book Maker'

        resolve()
    })
}
