const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const which = require('which')
// import WinReg, { Registry } from "winreg";
const regSync= require('./regSync')
const execSync = require('child_process')

//windows
const isWindows = process.platform.indexOf('win') === 0
const jdkRegistryKeyPaths = ["\\SOFTWARE\\JavaSoft\\JDK","\\SOFTWARE\\JavaSoft\\Java Development Kit"];
const jreRegistryKeyPaths = ["\\SOFTWARE\\JavaSoft\\Java Runtime Environment"];
function checkWindows(allowJre) {
    const possibleKeyPaths = allowJre ? jdkRegistryKeyPaths.concat(jreRegistryKeyPaths) : jdkRegistryKeyPaths;
    const {get, keys, HKLM} = regSync

    for(const path of possibleKeyPaths) {
        for (const regPath of keys(HKLM, path)) {
            const javaHome = get(regPath, 'JavaHome')

            if (javaHome) return javaHome.value;
        } 
    }
    return false
}

//env variables (mac & linux)
function checkJavaRuntime(JAVA_FILENAME) {
    const jdkEnvHome = process.env['JDK_HOME']
    const javaEnvHome = process.env['JAVA_HOME']
    const javaHome = jdkEnvHome ? jdkEnvHome : javaEnvHome
    return fs.existsSync(`${javaHome}/bin/${JAVA_FILENAME}`) ? javaHome : false
}


function findJavaHome({allowJre}) {
    const JAVA_FILENAME = (allowJre ? 'java' : 'javac') + (isWindows ? '.exe' : '');    
    const jHome = [
        // From registry (windows only)
        isWindows && checkWindows(allowJre),
        !isWindows && checkJavaRuntime(JAVA_FILENAME),
        !isWindows && checkMac(JAVA_FILENAME),
        !isWindows && checkLinux(JAVA_FILENAME)
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