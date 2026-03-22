declare namespace google.accounts.oauth2 {
	interface TokenClient {
		requestAccessToken(overrides?: { prompt?: string }): void;
	}

	interface TokenClientConfig {
		client_id: string;
		scope: string;
		callback: (response: TokenResponse) => void;
		error_callback?: (error: { type: string; message: string }) => void;
	}

	interface TokenResponse {
		access_token: string;
		expires_in: number;
		scope: string;
		token_type: string;
		error?: string;
		error_description?: string;
	}

	function initTokenClient(config: TokenClientConfig): TokenClient;
	function revoke(token: string, callback?: () => void): void;
}
