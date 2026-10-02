export class Mutex {
  private _locked: boolean = false;
  private _waiting: Array<() => void> = [];

  async lock(): Promise<Lock> {
    if (this._locked) {
      await new Promise<void>((resolve) => this._waiting.push(resolve));
    }
    this._locked = true;
    return new Lock(this);
  }

  unlock() {
    if (!this._locked) {
      throw new Error("Mutex is not locked");
    }
    this._locked = false;
    if (this._waiting.length > 0) {
      const next = this._waiting.shift();
      if (next) {
        next();
      }
    }
  }
}

export class Lock {
  private _mutex: Mutex;
  private _released: boolean = false;

  constructor(mutex: Mutex) {
    this._mutex = mutex;
  }

  release() {
    if (this._released) {
      throw new Error("Lock already released");
    }
    this._released = true;
    this._mutex.unlock();
  }

  [Symbol.dispose]() {
    this.release();
  }
}
