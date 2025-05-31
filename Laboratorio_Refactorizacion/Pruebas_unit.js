const { FileUtils } = require('./client.js');

// Mock DOM and browser APIs
global.document = {
    createElement: jest.fn().mockImplementation(tag => ({
        tagName: tag.toUpperCase(),
        href: '',
        download: '',
        click: jest.fn(),
        style: {}
    })),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
};
global.window = {
    URL: {
        createObjectURL: jest.fn(() => 'blob:http://localhost/file'),
        revokeObjectURL: jest.fn()
    }
};
global.fetch = jest.fn();
global.atob = str => Buffer.from(str, 'base64').toString('binary');
global.btoa = str => Buffer.from(str, 'binary').toString('base64');
global.Blob = jest.fn((array, options) => ({ array, type: options.type }));
global.Uint8Array = class Uint8Array extends Array {
    constructor(arr) {
        super();
        this.push(...arr);
    }
};

// Mock appState
const appState = {
    authToken: 'mock-token',
    selectedFile: null
};

// Mock DOM elements
const mockDOM = {
    fileNameDisplay: { textContent: '' },
    fileSelected: { style: { display: 'none' } },
    fileInput: { value: '' }
};

describe('FileUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        appState.selectedFile = null;
        mockDOM.fileNameDisplay.textContent = '';
        mockDOM.fileSelected.style.display = 'none';
        mockDOM.fileInput.value = '';
    });

    test('handleFileSelect should reject files larger than 10MB', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const file = { size: 11 * 1024 * 1024, name: 'large.pdf' };
        const event = { target: { files: [file] } };
        FileUtils.handleFileSelect(event);
        expect(appState.selectedFile).toBeNull();
        expect(mockDOM.fileNameDisplay.textContent).toBe('');
        expect(mockDOM.fileSelected.style.display).toBe('none');
        consoleErrorSpy.mockRestore();
    });

    test('handleFileSelect should accept valid files', () => {
        const file = { size: 5 * 1024 * 1024, name: 'test.pdf' };
        const event = { target: { files: [file] } };
        FileUtils.handleFileSelect(event);
        expect(appState.selectedFile).toBe(file);
        expect(mockDOM.fileNameDisplay.textContent).toBe('test.pdf');
        expect(mockDOM.fileSelected.style.display).toBe('block');
    });

    test('uploadFile should upload a file successfully', async () => {
        const file = { name: 'test.pdf', size: 1024, type: 'application/pdf' };
        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({
                file: { name: 'test.pdf', size: 1024, type: 'application/pdf', data: 'base64data' }
            })
        };
        fetch.mockResolvedValue(mockResponse);
        const result = await FileUtils.uploadFile(file);
        expect(fetch).toHaveBeenCalledWith('/upload-file', expect.anything());
        expect(result).toEqual({ name: 'test.pdf', size: 1024, type: 'application/pdf', data: 'base64data' });
    });

    test('uploadFile should handle errors', async () => {
        const file = { name: 'test.pdf' };
        fetch.mockResolvedValue({
            ok: false,
            json: jest.fn().mockResolvedValue({ message: 'Upload failed' })
        });
        await expect(FileUtils.uploadFile(file)).rejects.toThrow('Upload failed');
    });

    test('getFileIcon should return correct icon for MIME types', () => {
        expect(FileUtils.getFileIcon('image/png')).toBe('🖼️');
        expect(FileUtils.getFileIcon('video/mp4')).toBe('🎥');
        expect(FileUtils.getFileIcon('audio/mpeg')).toBe('🎵');
        expect(FileUtils.getFileIcon('application/pdf')).toBe('📄');
        expect(FileUtils.getFileIcon('text/plain')).toBe('📎');
    });

    test('formatFileSize should format sizes correctly', () => {
        expect(FileUtils.formatFileSize(0)).toBe('0 Bytes');
        expect(FileUtils.formatFileSize(1024)).toBe('1 KB');
        expect(FileUtils.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(FileUtils.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });

    test('downloadFile should create a downloadable link', () => {
        const base64Data = btoa('test content');
        const fileName = 'test.txt';
        const mimeType = 'text/plain';
        FileUtils.downloadFile(base64Data, fileName, mimeType);
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
});