import { createApp } from './app.js';
import { connectDB } from './db/connectDB.js';
import { deleteExpiredAuthenticationSessions } from './db/queries/authenticationSessions.js';
import createTables from './db/queries/createTables.js';

const startServer = async (): Promise<void> => {
    await connectDB();
    await createTables();
    await deleteExpiredAuthenticationSessions();

    const app = createApp();
    const port = Number(process.env.PORT ?? 5005);
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on port ${port}`);
    });
};

void startServer().catch((error: unknown) => {
    console.error('Unable to start the server.', error);
    process.exitCode = 1;
});
