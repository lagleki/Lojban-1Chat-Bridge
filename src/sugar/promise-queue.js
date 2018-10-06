// module dependencies
const Queue = require("./queue");
const { to } = require("await-to-js");

// here in case you want to use your own Promise
let SimpleQueuePromise;
if (typeof Promise !== "undefined") {
  SimpleQueuePromise = Promise;
} else {
  SimpleQueuePromise = () => {
    // this only happens if you don't have Promise
    throw new Error("Must call SimpleQueue.setPromise() first");
  };
}

// Just inherit everything form https://www.npmjs.com/package/queue
class SimpleQueue extends Queue {
  constructor(options) {
    super();
    const self = this;

    Queue.apply(self, arguments);

    if (typeof options !== "undefined") {
      if (options.autoStart === true) {
        ["push", "unshift"].forEach(method => {
          const old = self[method];
          self[method] = function(...args) {
            old.apply(self, args);
            if (self.jobs.length && self.running === false) {
              self.start();
            }
          };
        });
      }

      self.on("end", () => {
        if (self.jobs.length && self.running === false) {
          self.start();
        }
      });
    }
  }

  // Public methods below
  pushTask(promiseFunction) {
    return insertSimpleQueue(this, "push", promiseFunction);
  }

  unshiftTask(promiseFunction) {
    return insertSimpleQueue(this, "unshift", promiseFunction);
  }
}

// helper functions
const insertSimpleQueue = function insertSimpleQueue(
  queue,
  method,
  promiseFunction
) {
  // this promise will not be resolved till the delayed
  // promise is resolved/rejected
  return to(
    new SimpleQueuePromise((resolve, reject) => {
      // this function will create the promise when its time to
      const wrapperFunction = done => {
        new SimpleQueuePromise(promiseFunction)
          .then(
            value => {
              done();
              return value;
            },
            reason => {
              done();
              throw reason;
            }
          )
          .then(resolve, reject);
      };

      queue[method](wrapperFunction);
    })
  );
};

SimpleQueue.setPromise = CustomPromise => {
  SimpleQueuePromise = CustomPromise;
};

module.exports = SimpleQueue;
