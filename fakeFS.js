class SimpleEventEmitter {
    constructor() {
      this.events = {};
    }
  
    on(event, listener) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(listener);
    }
  
    emit(event, ...args) {
      if (this.events[event]) {
        this.events[event].forEach(listener => listener(...args));
      }
    }
  }
  
  class EnhancedFakeFS {
    constructor() {
      this.filePrefix = 'fakeFs:';
      this.fdCounter = 0; // File descriptor counter
      this.openFiles = {}; // Track open file descriptors
    }
  
    // Helper to get the storage key for a file or directory
    getStorageKey(path) {
      return `${this.filePrefix}${path}`;
    }
  
    // Convert binary data to Base64
    binaryToBase64(data) {
      return btoa(String.fromCharCode(...new Uint8Array(data)));
    }
  
    // Convert Base64 back to binary
    base64ToBinary(base64) {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
  
    // Write a file (supports text and binary data)
    writeFileSync(path, content, options = { encoding: 'utf8' }) {
      let data;
      if (options.encoding === 'utf8') {
        data = content;
      } else if (options.encoding === 'binary') {
        data = this.binaryToBase64(content);
      } else {
        throw new Error(`Unsupported encoding: ${options.encoding}`);
      }
      localStorage.setItem(this.getStorageKey(path), JSON.stringify({ data, encoding: options.encoding, type: 'file', created: Date.now(), modified: Date.now() }));
    }
  
    // Read a file (supports text and binary data)
    readFileSync(path, options = { encoding: 'utf8' }) {
      const file = localStorage.getItem(this.getStorageKey(path));
      if (!file) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      const { data, encoding } = JSON.parse(file);
      if (options.encoding === 'utf8' && encoding === 'utf8') {
        return data;
      } else if (options.encoding === 'binary' && encoding === 'binary') {
        return this.base64ToBinary(data);
      } else {
        throw new Error(`Unsupported encoding: ${options.encoding}`);
      }
    }
  
    async writeFile(path, content, options = { encoding: 'utf8' }) {
      this.writeFileSync(path, content, options);
    }
  
    async readFile(path, options = { encoding: 'utf8' }) {
      return this.readFileSync(path, options);
    }
  
    async appendFile(path, content, options = { encoding: 'utf8' }) {
      this.appendFileSync(path, content, options);
    }
  
    appendFileSync(path, content, options = { encoding: 'utf8' }) {
      const existingContent = this.existsSync(path) ? this.readFileSync(path, options) : '';
      const newContent = options.encoding === 'utf8' ? existingContent + content : new Uint8Array([...new Uint8Array(existingContent), ...new Uint8Array(content)]);
      this.writeFileSync(path, newContent, options);
    }
  
    async unlink(path) {
      this.unlinkSync(path);
    }
  
    unlinkSync(path) {
      if (!this.existsSync(path)) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
      }
      localStorage.removeItem(this.getStorageKey(path));
    }
  
    async mkdir(path) {
      this.mkdirSync(path);
    }
  
    mkdirSync(path) {
      if (this.existsSync(path)) {
        throw new Error(`EEXIST: file or directory already exists, mkdir '${path}'`);
      }
      localStorage.setItem(this.getStorageKey(path), JSON.stringify({ type: 'directory', children: [], created: Date.now(), modified: Date.now() }));
    }
  
    async rmdir(path) {
      this.rmdirSync(path);
    }
  
    rmdirSync(path) {
      if (!this.existsSync(path)) {
        throw new Error(`ENOENT: no such directory, rmdir '${path}'`);
      }
      const dir = JSON.parse(localStorage.getItem(this.getStorageKey(path)));
      if (dir.type !== 'directory') {
        throw new Error(`ENOTDIR: not a directory, rmdir '${path}'`);
      }
      if (dir.children && dir.children.length > 0) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
      }
      localStorage.removeItem(this.getStorageKey(path));
    }
  
    async readdir(path) {
      return this.readdirSync(path);
    }
  
    readdirSync(path) {
      const dir = localStorage.getItem(this.getStorageKey(path));
      if (!dir) {
        throw new Error(`ENOENT: no such directory, scandir '${path}'`);
      }
      const { type, children } = JSON.parse(dir);
      if (type !== 'directory') {
        throw new Error(`ENOTDIR: not a directory, scandir '${path}'`);
      }
      return children;
    }
  
    async rename(oldPath, newPath) {
      this.renameSync(oldPath, newPath);
    }
  
    renameSync(oldPath, newPath) {
      if (!this.existsSync(oldPath)) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      const data = localStorage.getItem(this.getStorageKey(oldPath));
      localStorage.setItem(this.getStorageKey(newPath), data);
      localStorage.removeItem(this.getStorageKey(oldPath));
    }
  
    async copyFile(src, dest) {
      this.copyFileSync(src, dest);
    }
  
    copyFileSync(src, dest) {
      if (!this.existsSync(src)) {
        throw new Error(`ENOENT: no such file or directory, copy '${src}'`);
      }
      const data = localStorage.getItem(this.getStorageKey(src));
      localStorage.setItem(this.getStorageKey(dest), data);
    }
  
    async truncate(path, len = 0) {
      this.truncateSync(path, len);
    }
  
    truncateSync(path, len = 0) {
      if (!this.existsSync(path)) {
        throw new Error(`ENOENT: no such file or directory, truncate '${path}'`);
      }
      let content = this.readFileSync(path);
      content = content.substring(0, len);
      this.writeFileSync(path, content);
    }
  
    async stat(path) {
      return this.statSync(path);
    }
  
    statSync(path) {
      const item = localStorage.getItem(this.getStorageKey(path));
      if (!item) {
        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      }
      const { type, created, modified, data } = JSON.parse(item);
      return {
        isFile: () => type === 'file',
        isDirectory: () => type === 'directory',
        size: data ? data.length : 0,
        created,
        modified,
      };
    }
  
    // File Streams
    createReadStream(path, options = {}) {
      const { encoding = 'utf8', highWaterMark = 64 * 1024 } = options; // Default chunk size: 64KB
      const emitter = new SimpleEventEmitter();
      try {
        const fileContent = this.readFileSync(path, { encoding });
        let position = 0;
  
        setTimeout(function readChunk() {
          if (position >= fileContent.length) {
            emitter.emit('end');
            return;
          }
  
          const chunk = fileContent.slice(position, position + highWaterMark);
          position += highWaterMark;
  
          emitter.emit('data', chunk);
          setTimeout(readChunk, 0); // Simulate async behavior
        }, 0);
      } catch (err) {
        setTimeout(() => emitter.emit('error', err), 0);
      }
  
      return emitter;
    }
  
    createWriteStream(path, options = {}) {
      const { encoding = 'utf8' } = options;
      const emitter = new SimpleEventEmitter();
      let buffer = '';
  
      emitter.write = (chunk) => {
        buffer += chunk;
        emitter.emit('drain');
      };
  
      emitter.end = () => {
        try {
          this.writeFileSync(path, buffer, { encoding });
          emitter.emit('finish');
        } catch (err) {
          emitter.emit('error', err);
        }
      };
  
      return emitter;
    }
  
    // File descriptor operations
    openSync(path, flags) {
      if (!this.existsSync(path)) {
        if (flags.includes('w')) {
          this.writeFileSync(path, '');
        } else {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
      }
      const fd = ++this.fdCounter;
      this.openFiles[fd] = path;
      return fd;
    }
  
    closeSync(fd) {
      if (!this.openFiles[fd]) {
        throw new Error(`EBADF: bad file descriptor, close '${fd}'`);
      }
      delete this.openFiles[fd];
    }
  }
  
  // Export the enhanced fake file system
  module.exports = new EnhancedFakeFS();
  