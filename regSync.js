/************************************************************************************************************
 * registry.js - contains a wrapper for the REG command under Windows, which provides access to the registry
 *
 * @author Paul Bottin a/k/a FrEsC
 *
 */

/* imports */
var util          = require('util')
,   path          = require('path')
,   spawnSync         = require('child_process').spawnSync

/* set to console.log for debugging */
,   log           = function () {}

/* registry hive ids */
,   HKLM          = 'HKLM'
,   HKCU          = 'HKCU'
,   HKCR          = 'HKCR'
,   HKU           = 'HKU'
,   HKCC          = 'HKCC'
,   HIVES         = [ HKLM, HKCU, HKCR, HKU, HKCC ]

/* registry value type ids */
,   REG_SZ        = 'REG_SZ'
,   REG_MULTI_SZ  = 'REG_MULTI_SZ'
,   REG_EXPAND_SZ = 'REG_EXPAND_SZ'
,   REG_DWORD     = 'REG_DWORD'
,   REG_QWORD     = 'REG_QWORD'
,   REG_BINARY    = 'REG_BINARY'
,   REG_NONE      = 'REG_NONE'
,   REG_TYPES     = [ REG_SZ, REG_MULTI_SZ, REG_EXPAND_SZ, REG_DWORD, REG_QWORD, REG_BINARY, REG_NONE ]

/* default registry value name */
,   DEFAULT_VALUE = ''

/* general key pattern */
,   KEY_PATTERN   = /(\\[a-zA-Z0-9_\s]+)*/

/* key path pattern (as returned by REG-cli) */
,   PATH_PATTERN  = /^(HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS|HKEY_CURRENT_CONFIG)(.*)$/

/* registry item pattern */
,   ITEM_PATTERN  = /^(.*)\s(REG_SZ|REG_MULTI_SZ|REG_EXPAND_SZ|REG_DWORD|REG_QWORD|REG_BINARY|REG_NONE)\s+([^\s].*)$/

/**
 * Creates an Error object that contains the exit code of the REG.EXE process.
 * This contructor is private. Objects of this type are created internally and returned in the <code>err</code> parameters in case the REG.EXE process doesn't exit cleanly.
 *
 * @private
 * @class
 *
 * @param {string} message - the error message
 * @param {number} code - the process exit code
 *
 */
function ProcessUncleanExitError(message, code) {
  if (!(this instanceof ProcessUncleanExitError))
    return new ProcessUncleanExitError(message, code);

  Error.captureStackTrace(this, ProcessUncleanExitError);

  /**
   * The error name.
   * @readonly
   * @member {string} ProcessUncleanExitError#name
   */
  this.__defineGetter__('name', function () { return ProcessUncleanExitError.name; });

  /**
   * The error message.
   * @readonly
   * @member {string} ProcessUncleanExitError#message
   */
  this.__defineGetter__('message', function () { return message; });

  /**
   * The process exit code.
   * @readonly
   * @member {number} ProcessUncleanExitError#code
   */
  this.__defineGetter__('code', function () { return code; });

}

util.inherits(ProcessUncleanExitError, Error);

/*
 * Captures stdout/stderr for a child process
 */
function captureOutput(child) {
  // Use a mutable data structure so we can append as we get new data and have
  // the calling context see the new data
  var output = {'stdout': '', 'stderr': ''};

  child.stdout.on('data', function(data) { output["stdout"] += data.toString(); });
  child.stderr.on('data', function(data) { output["stderr"] += data.toString(); });

  return output;
}


/*
 * Returns an error message containing the stdout/stderr of the child process
 */
function mkErrorMsg(registryCommand, code, output) {
    var stdout = output['stdout'].trim();
    var stderr = output['stderr'].trim();

    var msg = util.format("%s command exited with code %d:\n%s\n%s", registryCommand, code, stdout, stderr);
    return new ProcessUncleanExitError(msg, code);
}


/*
 * Converts x86/x64 to 32/64
 */
function convertArchString(archString) {
  if (archString == 'x64') {
    return '64';
  } else if (archString == 'x86') {
    return '32';
  } else {
    throw new Error('illegal architecture: ' + archString + ' (use x86 or x64)');
  }
}


/*
 * Adds correct architecture to reg args
 */
function pushArch(args, arch) {
  if (arch) {
    args.push('/reg:' + convertArchString(arch));
  }
}

/*
 * Get the path to system's reg.exe. Useful when another reg.exe is added to the PATH
 * Implemented only for Windows
 */
function getRegExePath() {
    return process.platform === 'win32' ? path.join(process.env.windir, 'system32', 'reg.exe') : 'REG'
}
function RegistryItem (host, hive, key, name, type, value, arch) {
}
function Registry () {}
Registry.HKLM = HKLM;
Registry.HKCU = HKCU;
Registry.HKCR = HKCR;
Registry.HKU = HKU;
Registry.HKCC = HKCC;
Registry.HIVES = HIVES;
Registry.REG_SZ = REG_SZ;
Registry.REG_MULTI_SZ = REG_MULTI_SZ;
Registry.REG_EXPAND_SZ = REG_EXPAND_SZ;
Registry.REG_DWORD = REG_DWORD;
Registry.REG_QWORD = REG_QWORD;
Registry.REG_BINARY = REG_BINARY;
Registry.REG_NONE = REG_NONE;
Registry.REG_TYPES = REG_TYPES;
Registry.DEFAULT_VALUE = DEFAULT_VALUE;


/**
 * Retrieve all subkeys from this registry key.
 * @param {function (err, items)} cb - callback function
 * @param {ProcessUncleanExitError=} cb.err - error object or null if successful
 * @param {array=} cb.items - an array of {@link Registry} objects
 * @returns {Registry} this registry key object
 */
const keys = (hive, path) => {
  const out = spawnSync(getRegExePath(), ["QUERY", hive + path]).output.toString()
  const lines = out.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  return lines.filter(line => PATH_PATTERN.exec(line))
              .map(line => hive + PATH_PATTERN.exec(line)[2]).slice(1)

};

/**
 * Gets a named value from this registry key.
 * @param {string} name - the value name, use {@link Registry.DEFAULT_VALUE} or an empty string for the default value
 * @param {function (err, item)} cb - callback function
 * @param {ProcessUncleanExitError=} cb.err - error object or null if successful
 * @param {RegistryItem=} cb.item - the retrieved registry item
 * @returns {Registry} this registry key object
 */
const get = (path, name) => {
  const out = spawnSync(getRegExePath(), ['QUERY', path, '/v', name]).output.toString()
  const lines = out.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line !== ',')
  //Get last item - so it works in XP where REG QUERY returns with a header
  const item = lines[lines.length - 1] || ''
  const match = ITEM_PATTERN.exec(item)
  return match && match.length ? {name: match[1].trim(), type: match[2].trim(), value: match[3]} : null
};



module.exports = {
  get,
  keys,
  HKLM
}