const config = {
    serverUrl: 'https://uniclip.phucngu.dev',
    apiEndpoints: {
        clipboard: '/api/clipboard',
        touch: (hash) => `/api/clipboard/${hash}/touch`
    }
};

export default config; 