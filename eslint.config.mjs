import config from '@iobroker/eslint-config';

export default [
    ...config,

    {
        languageOptions: {
            parserOptions: {
                ecmaVersion: 'latest',
            },

            globals: {
                systemDictionary: 'writable',
            },
        },
    },

    {
        ignores: [
            '**/*.d.ts',
            'admin/words.js',
            'eslint.config.mjs',
        ],
    },
];
