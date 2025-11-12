import { defineConfig } from '@rcmade/hono-docs'

export default defineConfig({
  tsConfigPath: './tsconfig.json',
  openApi: {
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000/api' }],
  },
  outputs: {
    openApiJson: './openapi/openapi.json',
  },
  apis: [
      {
        name: 'Seasons',
        apiPrefix: '/api/season',
        appTypePath: './src/routes/season.routes.ts',
        api: [
          {
            api: '/',
            method: 'get',
            summary: 'Get all seasons',
            description: 'Returns a list of all seasons.',
            tag: ['Seasons'],
          }
        ],
      },
    {
        name: 'Docs',
        apiPrefix: '/api/docs',
        appTypePath: './src/routes/docs.routes.ts',
        api: [
            {
                api: '/',
                method: 'get',
                summary: 'Get API Documentation',
                description: 'Returns the styled API documentation page.',
                tag: ['Documentation'],
            },
            {
                api: '/open-api',
                method: 'get',
                summary: 'Get OpenAPI Specification',
                description: 'Returns the raw OpenAPI specification JSON for the API.',
                tag: ['Documentation'],
            }
        ],
    },
  ],
})