export interface Payload {
	sid: string;
	type: string;
	data: string;
	channel: string;
	token: string;
}

export interface ConvertData {
	toPDF: boolean;
	url: string;
	fullpage: boolean;
}

export interface ExternalUser {
	token: string;
	email: string;
	name: string;
	first: string;
	last: string;
	avatarUrl: string;
}

export interface BulkUpdate {
	update: any;
	clauses: Array<Array<any>>;
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
		chanIn: "chan_in",
		presence: "presence"
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

	async createBulk(token: string, repo: string, docs: Array<any>) {
		return await this.req(token, "POST", `/db/${repo}?bulk=1`, docs)
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

	async updateBulk(token: string, repo: string, data: BulkUpdate) {
		return await this.req(token, "PUT", `/db/${repo}?bulk=1`, data);
	}

	async delete(token: string, repo: string, id: string) {
		return await this.req(token, "DELETE", `/db/${repo}/${id}`);
	}

	async storeFile(token: string, form: HTMLFormElement) {
		let fd = new FormData(form);
		return await this.rawreq("", token, "POST", "/storage/upload", fd);
	}

	async resizeImage(token: string, maxWidth: number, form: HTMLFormElement) {
		let fd = new FormData(form);
		fd.append("width", maxWidth.toString());
		return await this.rawreq("", token, "POST", "/extra/resizeimg", fd);
	}

	async convertURLToX(token: string, data: ConvertData) {
		return await this.req(token, "POST", "/extra/htmltox", data);
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
		this.sseClient = new EventSource(this.baseURL + `/sse/connect?sbpk=${this.pubKey}`);



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

	private generateId(): string {
		let dt = new Date().getTime();
		let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			let r = (dt + Math.random() * 16) % 16 | 0;
			dt = Math.floor(dt / 16);
			return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
		return "R" + uuid;
	}


	async socialLogin(provider: "twitter" | "google" | "facebook"): Promise<ExternalUser> {
		const reqId = this.generateId();
		console.log("reqid", reqId);
		
		const url = `${this.baseURL}/oauth/login?provider=${provider}&reqid=${reqId}&sbpk=${this.pubKey}`;
		window.open(url, "_blank");

		return await this.checkExternalUser(1, reqId);
	}

	private timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

	private async checkExternalUser(count: number, reqId: string): Promise<ExternalUser> {
		if (count >= 950) { 
			return {token: "", email: "", name: "", first: "", last: "", avatarUrl: ""};
		}

		const res = await this.req("", "GET", `/oauth/get-user?reqid=${reqId}`);
		if (!res.ok) {
			count++;
			await this.timeout(1750);
			return await this.checkExternalUser(count, reqId);
		}

		const user = res.content as ExternalUser;
		return user;
	}
}