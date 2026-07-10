/* Validates that the server address does not include protocol (http:// or https://) */
export function validateServerAddress(server: string): void {
    if (!server || typeof server !== 'string') {
        throw new Error('Server address is required and must be a string');
    }

    const trimmedServer = server.trim();

    if (trimmedServer.startsWith('http://') || trimmedServer.startsWith('https://')) {
        throw new Error(
            'Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname.'
        );
    }

    if (trimmedServer.includes('://')) {
        throw new Error(
            'Invalid server address: Protocol prefix detected. Please use only the hostname.'
        );
    }
}
