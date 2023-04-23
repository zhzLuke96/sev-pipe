import { ChildProcess } from "child_process";
import * as http from "http";

function requestApi(url: string, method: string, data: any) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

const mustChildProcess = () => {
  if (!process.connected) {
    throw new Error("ChildProcessMessage just run in ChildProcess");
  }
};
export class ChildProcessMessage {
  id: string;
  params: any;
  constructor(message: any) {
    mustChildProcess();
    const { id, params } = message;
    this.id = id;
    this.params = params;
  }

  recv(result: any) {
    process.send!({
      parent_id: this.id,
      result,
    });
  }
}

export class ChildProcessProducer {
  constructor(readonly fn: (params: any) => any) {
    mustChildProcess();
    process.on("message", async (payload) => {
      const message = new ChildProcessMessage(payload);
      const result = await fn(message.params);
      message.recv(result);
    });
  }
}

export class MainProcessMessage {
  id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  constructor(readonly child_process: ChildProcess, readonly params: any) {}

  async run() {
    const payload = {
      id: this.id,
      params: this.params,
    };

    return new Promise<any>((resolve) => {
      this.child_process.send(payload);
      this.child_process.on("message", (message) => {
        const { parent_id, result } = message as any;
        if (parent_id === this.id) {
          resolve(result);
        }
      });
    });
  }
}

export class ServiceCaller {
  context = {} as any;

  constructor(
    readonly name: string,
    readonly url = "http://localhost:4000/request"
  ) {}

  request(params: any) {
    return requestApi(this.url, "POST", {
      name: this.name,
      params,
      context: this.context,
    });
  }
}
