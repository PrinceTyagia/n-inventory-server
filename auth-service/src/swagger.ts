const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: "Auth Service API",
    description: "Automatically generated Swagger docs",
    version: "1.0.0"
  },
  host: "localhost:8000",
  basePath: "/api/v1",
  schemes: ["http"],
  tags: [
    {
      name: "Health",
      description: "Health check endpoints"
    },
    {
      name: "Organization",
      description: "Organisation check endpoints"
    }
  ],
  securityDefinitions: {
    BearerAuth: {
      type: "apiKey",
      in: "header",
      name: "Authorization",
      description: "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
    }
  }
};

const outputFile = './src/auth-service/swagger-output.json';
const endpointsFiles = [
  './src/auth-service/routes/health.ts',
  './routes/auth.routes.ts',
  './routes/orgainsation.routes.ts',
  './routes/user.routes.ts',
  './routes/role.routes.ts',
  './routes/loactions.routes.ts',

];

swaggerAutogen(outputFile, endpointsFiles, doc);
