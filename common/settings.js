const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const compareVersions = require('compare-versions')

const desktopPath = (relativePath) => {
    return path.join(__dirname, '../desktop/' + relativePath)
}

let config = {
    appVersion: '0.0.2',
    versionDate: 'June 11, 2023',
    fullScreen: false,
    debugApiCalls: false,
    interval: {
        loadingToast: 100,
    },
    timeout: {
        loadingMessage: 3000,
        delaySeek: 1000,
    },
    dataDir: 'E:/data/pbm/',
    imageMagickDir: '',
    sourceDirectories: [],
    maxBookPages: 108,
    spawnOptions: {
        stdio: 'ignore'
    }
}

let overridePath = 'E:/data/pbm.js'

if (process.platform === 'linux') {
    overridePath = '/media/trove/share/software/pbm/pbm-overrides.js'
}

if (fs.existsSync(overridePath)) {
    const overrides = require(overridePath)
    if (overrides.newVersion && compareVersions.compareVersions(config.appVersion, overrides.newVersion) === -1) {
        config.newVersionAvailable = true
    }
    config = _.merge(config, overrides)
}

config.imageMagickBinary = path.join(config.imageMagickDir, 'magick.exe')

config.desktopPath = desktopPath

module.exports = config
