import config from '@iobroker/eslint-config';
import globals from 'globals';

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
        files: ['**/*.test.js', 'test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.mocha,
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
