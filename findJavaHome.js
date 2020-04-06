const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const which = require('which')

//env variables (mac & linux)
function checkJavaRuntime(JAVA_FILENAME) {
    const jdkEnvHome = process.env['JDK_HOME']
    const javaEnvHome = process.env['JAVA_HOME']
    const javaHome = jdkEnvHome ? jdkEnvHome : javaEnvHome
    return fs.existsSync(`${javaHome}/bin/${JAVA_FILENAME}`) ? javaHome : false
}


function findJavaHome() {
    const JAVA_FILENAME = 'javac'
    const jHome = [
        checkJavaRuntime(JAVA_FILENAME),
        checkMac(JAVA_FILENAME),
        checkLinux(JAVA_FILENAME)
    ].filter(home => !!home) 
    
    return jHome.length ? jHome[0] : false 

}

function checkLinux(JAVA_FILENAME) {
    const javaBinaryPath = which.sync(JAVA_FILENAME, {nothrow:true})

    return path.dirname(path.dirname(findLinkedFile(javaBinaryPath)))


}

function checkMac(JAVA_FILENAME) {

        const javaBinaryPath = which.sync(JAVA_FILENAME, {nothrow:true})

        //resolve symlinks
        const traceLink = findLinkedFile(javaBinaryPath)

        //get the /bin directory
        // /usr/libexec/java_home
        const tracedLinkDir  = path.dirname(traceLink)

        //on mac, java install has a utility script called java_home that does the
        //dirty work for us
        const macUtility = path.resolve(tracedLinkDir, 'java_home')
        if (fs.existsSync(macUtility))
            return cp.execSync(macUtility, { cwd: tracedLinkDir }).toString().replace(/\n$/, '')
        return false
}


// iterate through symbolic links until
// file is found
function findLinkedFile(file) {
    if (!fs.lstatSync(file).isSymbolicLink()) return file;
    return findLinkedFile(fs.readlinkSync(file));
}

module.exports = findJavaHome
