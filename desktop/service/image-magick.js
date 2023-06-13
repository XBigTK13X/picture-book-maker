const spawn = require('child_process').spawn
const util = require('../../common/util')
const settings = require('../../common/settings')
const path = require('path')
const workspace = require('../service/workspace')

let binPath = null

class Coordinates{
    constructor(){
        this.topLeft = {
            x: 0,
            y: 0
        }
        this.topRight = {
            x: 0,
            y: 0
        }
        this.bottomRight = {
            x: 0,
            y: 0
        }
        this.bottomLeft = {
            x: 0,
            y: 0
        }
    }
    setTopLeft(x, y){
        this.topLeft = {
            x, y
        }
    }
    setTopRight(x, y){
        this.topRight = {
            x, y
        }
    }
    setBottomRight(x, y){
        this.bottomRight = {
            x, y
        }
    }
    setBottomLeft(x, y){
        this.bottomLeft = {
            x, y
        }
    }
    fromXYPairs(pairs){
        if(pairs.length === 4){
            pairs.sort((a,b)=>{
                return a.x - b.x
            })
            let left1 = pairs[0]
            let left2 = pairs[1]
            if(left2.y < left1.y){
                let temp = left1
                left1 = left2
                left2 = temp
            }
            let right1 = pairs[2]
            let right2 = pairs[3]
            if(right2.y < right1.y){
                let temp = right1
                right1 = right2
                right2 = temp
            }
            this.setTopLeft(left1.x, left1.y)
            this.setBottomLeft(left2.x, left2.y)
            this.setTopRight(right1.x, right1.y)
            this.setBottomRight(right2.x, right2.y)

        }
    }
    width(){
        return this.topRight.x - this.topLeft.x
    }

    height(){
        return this.bottomLeft.y - this.topLeft.y
    }
}

// Current strategy is to crop the interior rectangle of the coordinates.
// In the future, I would like a strategy that deforms the selection to fit a desired output size.
const crop = (inputPath, rawCoordinates, outputPath) => {
    return new Promise((resolve,reject)=>{
        if(!binPath){
            binPath = path.join(settings.imageMagickDir,'magick.exe')
        }
        let selectionCoordinates = new Coordinates()
        selectionCoordinates.fromXYPairs(rawCoordinates)
        let cropCoordinates = new Coordinates()
        // Choose a rentangle inside the lowest value of each bounding box
        let lowX = selectionCoordinates.topLeft.x > selectionCoordinates.bottomLeft.x ? selectionCoordinates.topLeft.x : selectionCoordinates.bottomLeft.x
        let lowY = selectionCoordinates.topLeft.y > selectionCoordinates.topRight.y ? selectionCoordinates.topLeft.y : selectionCoordinates.topRight.y
        let highX = selectionCoordinates.topRight.x < selectionCoordinates.bottomRight.x ? selectionCoordinates.topRight.x : selectionCoordinates.bottomRight.x
        let highY = selectionCoordinates.bottomLeft.y < selectionCoordinates.bottomRight.y ? selectionCoordinates.bottomLeft.y : selectionCoordinates.bottomRight.y
        cropCoordinates.setTopLeft(lowX, lowY)
        cropCoordinates.setTopRight(highX, lowY)
        cropCoordinates.setBottomRight(highX, highY)
        cropCoordinates.setBottomLeft(lowX, highY)
        const args = [
            'convert',
            '-quality',
            settings.exportQuality,
            `${inputPath}`,
            '-crop',
            `${cropCoordinates.width()}x${cropCoordinates.height()}+${cropCoordinates.topLeft.x}+${cropCoordinates.topLeft.y}`,
            `${outputPath}`
        ]
        const magick = spawn(binPath, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const rotate = (inputPath, rotationDegrees, outputPath)=>{
    return new Promise((resolve)=>{
        const args = [
            'convert',
            '-quality',
            '100%',
            inputPath,
            '-rotate',
            rotationDegrees,
            outputPath
        ]
        const magick = spawn(binPath, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const stitch = (firstImage, secondImage, outputPath)=>{
    return new Promise((resolve)=>{
        const args = [
            'convert',
            '-quality',
            '100%',
            '+append',
            firstImage,
            secondImage,
            outputPath
        ]
        const magick = spawn(binPath, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

module.exports = {
    crop,
    rotate,
    stitch
}