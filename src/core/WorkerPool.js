// A small team of background workers. Jobs wait in a queue and go to
// whichever worker is free. Each job returns a Promise (a "result later").

export class WorkerPool {
  constructor(createWorker, size) {
    this.idle = [];
    this.queue = [];
    this.pending = new Map(); // job id -> { resolve, reject }
    this.nextId = 1;

    this.workers = [];
    for (let i = 0; i < size; i++) {
      const worker = createWorker();
      this.workers.push(worker);
      worker.onmessage = (e) => this.finish(worker, e.data);
      worker.onerror = (e) => console.error('Worker error:', e.message);
      this.idle.push(worker);
    }
    this.size = size;
  }

  run(job) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.queue.push({ ...job, id });
      this.dispatch();
    });
  }

  // Jobs that are waiting or running.
  get busy() {
    return this.queue.length + (this.size - this.idle.length);
  }

  dispatch() {
    while (this.idle.length > 0 && this.queue.length > 0) {
      this.idle.pop().postMessage(this.queue.shift());
    }
  }

  terminate() {
    for (const worker of this.workers) worker.terminate();
    this.queue = [];
  }

  finish(worker, result) {
    const job = this.pending.get(result.id);
    this.pending.delete(result.id);
    this.idle.push(worker);
    this.dispatch();
    job?.resolve(result);
  }
}
