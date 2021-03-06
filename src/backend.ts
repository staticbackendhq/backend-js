export interface Payload {
	sid: string;
	type: string;
	data: string;
	channel: string;
	token: string;
}

export class Backend {
	private baseURL: string = "https://na1.staticbackend.com";
	private wsURL: string = "wss://na1.staticbackend.com";
	private ws: WebSocket = null;
	private wsId: string = null;
	private wsToken: string = null;
	private sseClient = null;
	private pubKey: string = "";

	types = {
		ok: "ok",
		error: "error",
		init: "init",
		token: "token",
		joined: "joined",
		chanOut: "chan_out",
		dbCreated: "db_created",
		dbUpdated: "db_updated",
		dbDeleted: "db_deleted",
		echo: "echo",
		auth: "auth",
		join: "join",
		chanIn: "chan_in"
	}

	constructor(key: string, region: string) {
		this.pubKey = key;

		if (region) {
			if (region == "dev") {
				this.baseURL = "http://localhost:8099";
				this.wsURL = "ws://localhost:8099";
			} else if (region.length < 10) {
				this.baseURL = `https://${region}.staticbackend.com`;
				this.wsURL = `wss://${region}.staticbackend.com`;
			} else {
				// custom base URL
				this.baseURL = region;
				this.wsURL = region.replace("https", "wss");
			}
		}
	}

	private async rawreq(ct: string, token: string, method: string, path: string, body?: any) {
		try {
			let rawBody = null;
			if (body) {
				rawBody = ct == "application/json" ? JSON.stringify(body) : body;
			}

			let headers = {
				"SB-PUBLIC-KEY": this.pubKey
			};

			if (ct && ct.length) {
				headers["Content-Type"] = ct;
			}

			if (token) {
				headers["Authorization"] = `Bearer ${token}`;
			}

			const resp = await fetch(`${this.baseURL}${path}`, {
				method: method,
				headers: headers,
				body: rawBody
			});

			var content: any = null;
			if (resp.status > 299) {
				content = await resp.text();
				return { ok: false, content: content };
			}

			content = await resp.json();
			return { ok: true, content: content };
		} catch (err) {
			console.error(err);
			return { ok: false, content: err };
		}
	}

	private async req(token: string, method: string, path: string, body?: any) {
		return await this.rawreq("application/json", token, method, path, body);
	}

	async register(email: string, pw: string) {
		const body = { email: email, password: pw };
		return await this.req("", "POST", "/register", body);
	}

	async login(email: string, pw: string) {
		const body = { email: email, password: pw };
		return await this.req("", "POST", "/login", body);
	}

	async create(token: string, repo: string, doc) {
		return await this.req(token, "POST", `/db/${repo}`, doc)
	}

	async list(token: string, repo: string) {
		return await this.req(token, "GET", `/db/${repo}`);
	}

	async getById(token: string, repo: string, id: string) {
		return await this.req(token, "GET", `/db/${repo}/${id}`);
	}

	async query(token: string, repo: string, filters) {
		return await this.req(token, "POST", `/query/${repo}`, filters);
	}

	async update(token: string, repo: string, id: string, doc) {
		return await this.req(token, "PUT", `/db/${repo}/${id}`, doc)
	}

	async delete(token: string, repo: string, id: string) {
		return await this.req(token, "DELETE", `/db/${repo}/${id}`);
	}

	async storeFile(token: string, form: HTMLFormElement) {
		let fd = new FormData(form);
		return await this.rawreq("", token, "POST", "/storage/upload", fd);
	}

	connectWS(token: string, onAuth: (tok: string) => void, onMessage: (pl: Payload) => void) {
		this.ws = new WebSocket(this.wsURL + "/ws");

		this.ws.onerror = (e) => { console.error(e); }
		this.ws.onmessage = (e) => {
			try {
				let pl: Payload = JSON.parse(e.data);
				// for the init msg we authenticate the connection
				if (pl.type == this.types.init) {
					this.wsId = pl.data;
					this.send(this.types.auth, token);
				} else if (pl.type == this.types.token) {
					this.wsToken = pl.data;
					onAuth(pl.data);
				} else {
					onMessage(pl);
				}
			} catch (ex) {
				console.error(ex);
			}
		}
	}

	sendWS(t: string, data: string, channel?: string): boolean {
		if (this.ws == null) {
			return false;
		}

		let pl: Payload = {
			sid: this.wsId,
			token: this.wsToken,
			type: t,
			data: data,
			channel: channel
		}
		this.ws.send(JSON.stringify(pl));
		return true;
	}

	connect(token: string, onAuth: (tok: string) => void, onMessage: (pl: Payload) => void) {
		this.sseClient = new EventSource(this.baseURL + "/sse/connect");



		this.sseClient.onerror = (e) => { console.error(e); }
		this.sseClient.onmessage = (e) => {
			try {
				let pl: Payload = JSON.parse(e.data);
				// for the init msg we authenticate the connection
				if (pl.type == this.types.init) {
					this.wsId = pl.data;
					this.wsToken = token;
					this.send(this.types.auth, token);
				} else if (pl.type == this.types.token) {
					//this.wsToken = pl.data;
					onAuth(this.wsToken);
				} else {
					onMessage(pl);
				}
			} catch (ex) {
				console.error(ex);
			}
		}
	}

	send(t: string, data: string, channel?: string): boolean {
		if (this.sseClient == null || this.sseClient.readyState == 2) {
			return false;
		}

		let pl: Payload = {
			sid: this.wsId,
			token: this.wsToken,
			type: t,
			data: data,
			channel: channel
		};

		(async () => {
			return await this.req(this.wsToken, "POST", "/sse/msg", pl);
		})();

		return true;
	}

}