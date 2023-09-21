const fs = require('fs')
const spawn = require('child_process').spawn
const settings = require('../../common/settings')

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

const pairsToCoordinates = (xyPairs)=>{
    let selection = new Coordinates()
    selection.fromXYPairs(xyPairs)
    let interiorFit = new Coordinates()
    // Choose a rentangle inside the bounding box
    let lowX = selection.topLeft.x > selection.bottomLeft.x ? selection.topLeft.x : selection.bottomLeft.x
    let lowY = selection.topLeft.y > selection.topRight.y ? selection.topLeft.y : selection.topRight.y
    let highX = selection.topRight.x < selection.bottomRight.x ? selection.topRight.x : selection.bottomRight.x
    let highY = selection.bottomLeft.y < selection.bottomRight.y ? selection.bottomLeft.y : selection.bottomRight.y
    interiorFit.setTopLeft(lowX, lowY)
    interiorFit.setTopRight(highX, lowY)
    interiorFit.setBottomRight(highX, highY)
    interiorFit.setBottomLeft(lowX, highY)
    return {
        interiorFit: interiorFit,
        selection: selection
    }
}

// https://legacy.imagemagick.org/Usage/distorts/#perspective
// https://stackoverflow.com/questions/12276098/understanding-perspective-projection-distortion-imagemagick
const distort = (inputPath, rawCoordinates, outputPath) =>{
    return new Promise((resolve)=>{
        let coordinates = pairsToCoordinates(rawCoordinates)
        let coordMap = [
            coordinates.selection.topLeft.x+','+coordinates.selection.topLeft.y,
            coordinates.interiorFit.topLeft.x+','+coordinates.interiorFit.topLeft.y,
            coordinates.selection.topRight.x+','+coordinates.selection.topRight.y,
            coordinates.interiorFit.topRight.x+','+coordinates.interiorFit.topRight.y,
            coordinates.selection.bottomRight.x+','+coordinates.selection.bottomRight.y,
            coordinates.interiorFit.bottomRight.x+','+coordinates.interiorFit.bottomRight.y,
            coordinates.selection.bottomLeft.x+','+coordinates.selection.bottomLeft.y,
            coordinates.interiorFit.bottomLeft.x+','+coordinates.interiorFit.bottomLeft.y,
        ]
        const args = [
            'convert',
            '-quality',
            '100%',
            `${inputPath}`,
            '-distort',
            'perspective',
            coordMap.join(' '),
            '-virtual-pixel',
            'Black',
            '-strip',
            `${outputPath}`
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const crop = (inputPath, rawCoordinates, outputPath) => {
    return new Promise((resolve,reject)=>{
        let coordinates = pairsToCoordinates(rawCoordinates)
        const args = [
            'convert',
            '-quality',
            '100%',
            `${inputPath}`,
            '-crop',
            `${coordinates.interiorFit.width()}x${coordinates.interiorFit.height()}+${coordinates.interiorFit.topLeft.x}+${coordinates.interiorFit.topLeft.y}`,
            '-strip',
            `${outputPath}`
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
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
            '-strip',
            outputPath
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
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
            '-strip',
            outputPath
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const convert = (inputPath, outputPath)=>{
    return new Promise((resolve)=>{
        const args = [
            'convert',
            '-quality',
            '100%',
            inputPath,
            '-strip',
            outputPath
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const resize = (inputPath, width, height, outputPath)=>{
    return new Promise((resolve)=>{
        const args = [
            'convert',
            inputPath,
            '-resize',
            `${width}x${height}\!`,
            '-strip',
            outputPath
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const resizeGentle = (inputPath, width, height, outputPath)=>{
    return new Promise((resolve)=>{
        const args = [
            'convert',
            inputPath,
            '-resize',
            `${width}x${height}`,
            '-strip',
            outputPath
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const normalize = (inputPath, brightnessPercent, outputPath)=>{
    return new Promise((resolve)=>{
        const args = [
            inputPath,
            '-quality',
            '100%',
            '-define',
            'modulate:colorspace=HSB',
            '-modulate',
            brightnessPercent,
            outputPath
        ]
        const magick = spawn(settings.imageMagickBinary, args, settings.spawnOptions)
        magick.on('exit', (code)=>{
            resolve()
        })
    })
}

const copy = (inputPath, outputPath) => {
    return new Promise((resolve,reject)=>{
        fs.copyFile(inputPath, outputPath, (err)=>{
            if(err){
                return reject(err)
            }
            return resolve()
        })
        resolve()
    })
}

module.exports = {
    convert,
    crop,
    distort,
    normalize,
    resize,
    resizeGentle,
    rotate,
    stitch,
    copy
}