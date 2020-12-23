# @staticbackend/js
[StaticBackend](https://staticbackend.com)'s JavaScript client library.

### Installation

```shell
$> npm install @staticbackend/js
```

### Usage

```javascript
import { Backend } from "@staticbackend/js";

const bkn = new Backend("your-public-token", "na1");
```

**Parameters**:

* Your public key
* The region (we only supports `na1` or `dev` for now)

**If using the development server**:

You may initiate the client like this for development:

```javascript
const bkn = new Backend("anything", "dev");
```

When using the development server you don't need a valid public key.

### Available helpers

**register(email: string, password: string)**

All you users will need a session token to perform CRUD operations against your 
database. *Note that it's possible to have public repository*.

```javascript
const registerButton = document.getElementById("registerButton");
registerButton.addEventListener("click", async (e) => {
	const result = await bkn.register("user@company.com", "their-password");
	if (!result.ok) {
		// could not register that user
		console.error(result.content);
		return
	}

	// you must use this token on all sub-sequent requests:
	const token = result.content;

	// Ideally you'd store that somewhere for that user to retrieve like 
	// SessionStorage for instance.
});
```

**login(email: string, password: string)**

The `login` function is identical to the `register`. You'll receive a session 
token on successful login.

```javascript
const result = await bkn.login(email, pass);
// handle result.ok == false or result.content contains their token.
```

#### Database

**create(token: string, repo: string, doc)**



```javascript
createProjectButton.addEventListener("click", async (e) => {
	// thos values would come from <input> or something from your app
	const project = {
		name: "New project name",
		active: false,
		created: new Date()
	};

	const result = await bkn.create(token, "projects", project);
	// handle !result.ok or created document in result.content
});
```

**list(token: string, repo: string)**

```javascript
const result = await bkn.list(token, "projects");
// handle !result.ok or result.content is an object
/*
{
	"page": 1,
	"total": 159,
	"results": [{
		id: "an id",
		name: "New project name",
		active: false,
		created: "20201223T07:48:24"
	}]
}
*/
```

**getById(token: string, repo: string, id: string)**

This return the document by ID.

**query(token: string, repo: string, filters)**

```javascript
const filters = [
	["active", "==", false]
];

const result = await bkn.query(token, "projects", filters)
// handle !result.ok or result.content contains same as list().
```

The `filters` is an array or array having the following format:

```javascript
["field-name", "operator", value]
```

The supported operators are:

```javascript
"==", "!=", ">", "<", ">=", "<=", "in", "!in"
```

**update(token: string, repo: string, id: string, doc)**

Update a document by its ID, and only for the properties in the `doc` parameter.

**delete(token: string, repo: string, id: string)**

Delete a document by its ID

#### Upload file

```html
<form enctype="multipart/form-data">
	<input type="file" name="file" />
</form>
<p>
	<button id="upbtn">upload file</button>
</p>
```

```javascript
const upbtn = document.getElementById("upbtn");
upbtn.addEventListener("click", async (e) => {
	// you can grab your form by ID or whatever
	const form = document.forms[0];
	const result = await bkn.storeFile(token, form);
	if (!result.ok) {
		console.error(result.content);
		return;
	}

	console.log("file url", result.content);
})
```

*When using the development server the URLs return will not be fully qualified 
domain name*.

In production our CDN URL are returned.