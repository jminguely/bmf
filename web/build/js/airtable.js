require = (function () { function r(e, n, t) { function o(i, f) { if (!n[i]) { if (!e[i]) { const c = typeof require === 'function' && require; if (!f && c) return c(i, !0); if (u) return u(i, !0); const a = new Error(`Cannot find module '${i}'`); throw a.code = 'MODULE_NOT_FOUND', a; } const p = n[i] = { exports: {} }; e[i][0].call(p.exports, (r) => { const n = e[i][1][r]; return o(n || r); }, p, p.exports, r, e, n, t); } return n[i].exports; } for (var u = typeof require === 'function' && require, i = 0; i < t.length; i++)o(t[i]); return o; } return r; }())({
  1: [function (require, module, exports) {
    // istanbul ignore file
    let AbortController;
    const browserGlobal = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : null; // self is the global in web workers
    if (!browserGlobal) {
      AbortController = require('abort-controller');
    } else if ('signal' in new Request('https://airtable.com')) {
      AbortController = browserGlobal.AbortController;
    } else {
      /* eslint-disable @typescript-eslint/no-var-requires */
      const polyfill = require('abortcontroller-polyfill/dist/cjs-ponyfill');
      /* eslint-enable @typescript-eslint/no-var-requires */
      AbortController = polyfill.AbortController;
    }
    module.exports = AbortController;
  }, { 'abort-controller': 20, 'abortcontroller-polyfill/dist/cjs-ponyfill': 19 }],
  2: [function (require, module, exports) {
    const AirtableError = /** @class */ (function () {
      function AirtableError(error, message, statusCode) {
        this.error = error;
        this.message = message;
        this.statusCode = statusCode;
      }
      AirtableError.prototype.toString = function () {
        return [
          this.message,
          '(',
          this.error,
          ')',
          this.statusCode ? `[Http code ${this.statusCode}]` : '',
        ].join('');
      };
      return AirtableError;
    }());
    module.exports = AirtableError;
  }, {}],
  3: [function (require, module, exports) {
    var __assign = (this && this.__assign) || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (const p in s) { if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]; }
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const get_1 = __importDefault(require('lodash/get'));
    const isPlainObject_1 = __importDefault(require('lodash/isPlainObject'));
    const keys_1 = __importDefault(require('lodash/keys'));
    const fetch_1 = __importDefault(require('./fetch'));
    const abort_controller_1 = __importDefault(require('./abort-controller'));
    const object_to_query_param_string_1 = __importDefault(require('./object_to_query_param_string'));
    const airtable_error_1 = __importDefault(require('./airtable_error'));
    const table_1 = __importDefault(require('./table'));
    const http_headers_1 = __importDefault(require('./http_headers'));
    const run_action_1 = __importDefault(require('./run_action'));
    const package_version_1 = __importDefault(require('./package_version'));
    const exponential_backoff_with_jitter_1 = __importDefault(require('./exponential_backoff_with_jitter'));
    const userAgent = `Airtable.js/${package_version_1.default}`;
    const Base = /** @class */ (function () {
      function Base(airtable, baseId) {
        this._airtable = airtable;
        this._id = baseId;
      }
      Base.prototype.table = function (tableName) {
        return new table_1.default(this, null, tableName);
      };
      Base.prototype.makeRequest = function (options) {
        const _this = this;
        let _a;
        if (options === void 0) { options = {}; }
        const method = get_1.default(options, 'method', 'GET').toUpperCase();
        const url = `${this._airtable._endpointUrl}/v${this._airtable._apiVersionMajor}/${this._id}${get_1.default(options, 'path', '/')}?${object_to_query_param_string_1.default(get_1.default(options, 'qs', {}))}`;
        const controller = new abort_controller_1.default();
        const headers = this._getRequestHeaders(Object.assign({}, this._airtable._customHeaders, (_a = options.headers) !== null && _a !== void 0 ? _a : {}));
        const requestOptions = {
          method,
          headers,
          signal: controller.signal,
        };
        if ('body' in options && _canRequestMethodIncludeBody(method)) {
          requestOptions.body = JSON.stringify(options.body);
        }
        const timeout = setTimeout(() => {
          controller.abort();
        }, this._airtable._requestTimeout);
        return new Promise(((resolve, reject) => {
          fetch_1.default(url, requestOptions)
            .then((resp) => {
              clearTimeout(timeout);
              if (resp.status === 429 && !_this._airtable._noRetryIfRateLimited) {
                const numAttempts_1 = get_1.default(options, '_numAttempts', 0);
                const backoffDelayMs = exponential_backoff_with_jitter_1.default(numAttempts_1);
                setTimeout(() => {
                  const newOptions = __assign(__assign({}, options), { _numAttempts: numAttempts_1 + 1 });
                  _this.makeRequest(newOptions)
                    .then(resolve)
                    .catch(reject);
                }, backoffDelayMs);
              } else {
                resp.json()
                  .then((body) => {
                    const err = _this._checkStatusForError(resp.status, body)
                      || _getErrorForNonObjectBody(resp.status, body);
                    if (err) {
                      reject(err);
                    } else {
                      resolve({
                        statusCode: resp.status,
                        headers: resp.headers,
                        body,
                      });
                    }
                  })
                  .catch(() => {
                    const err = _getErrorForNonObjectBody(resp.status);
                    reject(err);
                  });
              }
            })
            .catch((err) => {
              clearTimeout(timeout);
              err = new airtable_error_1.default('CONNECTION_ERROR', err.message, null);
              reject(err);
            });
        }));
      };
      /**
       * @deprecated This method is deprecated.
       */
      Base.prototype.runAction = function (method, path, queryParams, bodyData, callback) {
        run_action_1.default(this, method, path, queryParams, bodyData, callback, 0);
      };
      Base.prototype._getRequestHeaders = function (headers) {
        const result = new http_headers_1.default();
        result.set('Authorization', `Bearer ${this._airtable._apiKey}`);
        result.set('User-Agent', userAgent);
        result.set('Content-Type', 'application/json');
        for (let _i = 0, _a = keys_1.default(headers); _i < _a.length; _i++) {
          const headerKey = _a[_i];
          result.set(headerKey, headers[headerKey]);
        }
        return result.toJSON();
      };
      Base.prototype._checkStatusForError = function (statusCode, body) {
        const _a = (body !== null && body !== void 0 ? body : { error: {} }).error; const
          error = _a === void 0 ? {} : _a;
        const { type } = error;
        const { message } = error;
        if (statusCode === 401) {
          return new airtable_error_1.default('AUTHENTICATION_REQUIRED', 'You should provide valid api key to perform this operation', statusCode);
        }
        if (statusCode === 403) {
          return new airtable_error_1.default('NOT_AUTHORIZED', 'You are not authorized to perform this operation', statusCode);
        }
        if (statusCode === 404) {
          return new airtable_error_1.default('NOT_FOUND', message !== null && message !== void 0 ? message : 'Could not find what you are looking for', statusCode);
        }
        if (statusCode === 413) {
          return new airtable_error_1.default('REQUEST_TOO_LARGE', 'Request body is too large', statusCode);
        }
        if (statusCode === 422) {
          return new airtable_error_1.default(type !== null && type !== void 0 ? type : 'UNPROCESSABLE_ENTITY', message !== null && message !== void 0 ? message : 'The operation cannot be processed', statusCode);
        }
        if (statusCode === 429) {
          return new airtable_error_1.default('TOO_MANY_REQUESTS', 'You have made too many requests in a short period of time. Please retry your request later', statusCode);
        }
        if (statusCode === 500) {
          return new airtable_error_1.default('SERVER_ERROR', 'Try again. If the problem persists, contact support.', statusCode);
        }
        if (statusCode === 503) {
          return new airtable_error_1.default('SERVICE_UNAVAILABLE', 'The service is temporarily unavailable. Please retry shortly.', statusCode);
        }
        if (statusCode >= 400) {
          return new airtable_error_1.default(type !== null && type !== void 0 ? type : 'UNEXPECTED_ERROR', message !== null && message !== void 0 ? message : 'An unexpected error occurred', statusCode);
        }

        return null;
      };
      Base.prototype.doCall = function (tableName) {
        return this.table(tableName);
      };
      Base.prototype.getId = function () {
        return this._id;
      };
      Base.createFunctor = function (airtable, baseId) {
        const base = new Base(airtable, baseId);
        const baseFn = function (tableName) {
          return base.doCall(tableName);
        };
        baseFn._base = base;
        baseFn.table = base.table.bind(base);
        baseFn.makeRequest = base.makeRequest.bind(base);
        baseFn.runAction = base.runAction.bind(base);
        baseFn.getId = base.getId.bind(base);
        return baseFn;
      };
      return Base;
    }());
    function _canRequestMethodIncludeBody(method) {
      return method !== 'GET' && method !== 'DELETE';
    }
    function _getErrorForNonObjectBody(statusCode, body) {
      if (isPlainObject_1.default(body)) {
        return null;
      }

      return new airtable_error_1.default('UNEXPECTED_ERROR', 'The response from Airtable was invalid JSON. Please try again soon.', statusCode);
    }
    module.exports = Base;
  }, {
    './abort-controller': 1, './airtable_error': 2, './exponential_backoff_with_jitter': 6, './fetch': 7, './http_headers': 9, './object_to_query_param_string': 11, './package_version': 12, './run_action': 16, './table': 17, 'lodash/get': 77, 'lodash/isPlainObject': 89, 'lodash/keys': 93,
  }],
  4: [function (require, module, exports) {
    /**
     * Given a function fn that takes a callback as its last argument, returns
     * a new version of the function that takes the callback optionally. If
     * the function is not called with a callback for the last argument, the
     * function will return a promise instead.
     */
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */
    function callbackToPromise(fn, context, callbackArgIndex) {
      if (callbackArgIndex === void 0) { callbackArgIndex = void 0; }
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */
      return function () {
        const callArgs = [];
        for (let _i = 0; _i < arguments.length; _i++) {
          callArgs[_i] = arguments[_i];
        }
        let thisCallbackArgIndex;
        if (callbackArgIndex === void 0) {
          // istanbul ignore next
          thisCallbackArgIndex = callArgs.length > 0 ? callArgs.length - 1 : 0;
        } else {
          thisCallbackArgIndex = callbackArgIndex;
        }
        const callbackArg = callArgs[thisCallbackArgIndex];
        if (typeof callbackArg === 'function') {
          fn.apply(context, callArgs);
          return void 0;
        }

        const args_1 = [];
        // If an explicit callbackArgIndex is set, but the function is called
        // with too few arguments, we want to push undefined onto args so that
        // our constructed callback ends up at the right index.
        const argLen = Math.max(callArgs.length, thisCallbackArgIndex);
        for (let i = 0; i < argLen; i++) {
          args_1.push(callArgs[i]);
        }
        return new Promise(((resolve, reject) => {
          args_1.push((err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
          fn.apply(context, args_1);
        }));
      };
    }
    module.exports = callbackToPromise;
  }, {}],
  5: [function (require, module, exports) {
    const didWarnForDeprecation = {};
    /**
     * Convenience function for marking a function as deprecated.
     *
     * Will emit a warning the first time that function is called.
     *
     * @param fn the function to mark as deprecated.
     * @param key a unique key identifying the function.
     * @param message the warning message.
     *
     * @return a wrapped function
     */
    function deprecate(fn, key, message) {
      return function () {
        const args = [];
        for (let _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        if (!didWarnForDeprecation[key]) {
          didWarnForDeprecation[key] = true;
          console.warn(message);
        }
        fn.apply(this, args);
      };
    }
    module.exports = deprecate;
  }, {}],
  6: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const internal_config_json_1 = __importDefault(require('./internal_config.json'));
    // "Full Jitter" algorithm taken from https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
    function exponentialBackoffWithJitter(numberOfRetries) {
      const rawBackoffTimeMs = internal_config_json_1.default.INITIAL_RETRY_DELAY_IF_RATE_LIMITED * Math.pow(2, numberOfRetries);
      const clippedBackoffTimeMs = Math.min(internal_config_json_1.default.MAX_RETRY_DELAY_IF_RATE_LIMITED, rawBackoffTimeMs);
      const jitteredBackoffTimeMs = Math.random() * clippedBackoffTimeMs;
      return jitteredBackoffTimeMs;
    }
    module.exports = exponentialBackoffWithJitter;
  }, { './internal_config.json': 10 }],
  7: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    // istanbul ignore file
    const node_fetch_1 = __importDefault(require('node-fetch'));
    const browserGlobal = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : null; // self is the global in web workers
    module.exports = !browserGlobal ? node_fetch_1.default : browserGlobal.fetch.bind(browserGlobal);
  }, { 'node-fetch': 20 }],
  8: [function (require, module, exports) {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    function has(object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    }
    module.exports = has;
  }, {}],
  9: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const keys_1 = __importDefault(require('lodash/keys'));
    const isBrowser = typeof window !== 'undefined';
    const HttpHeaders = /** @class */ (function () {
      function HttpHeaders() {
        this._headersByLowercasedKey = {};
      }
      HttpHeaders.prototype.set = function (headerKey, headerValue) {
        let lowercasedKey = headerKey.toLowerCase();
        if (lowercasedKey === 'x-airtable-user-agent') {
          lowercasedKey = 'user-agent';
          headerKey = 'User-Agent';
        }
        this._headersByLowercasedKey[lowercasedKey] = {
          headerKey,
          headerValue,
        };
      };
      HttpHeaders.prototype.toJSON = function () {
        const result = {};
        for (let _i = 0, _a = keys_1.default(this._headersByLowercasedKey); _i < _a.length; _i++) {
          const lowercasedKey = _a[_i];
          const headerDefinition = this._headersByLowercasedKey[lowercasedKey];
          let headerKey = void 0;
          /* istanbul ignore next */
          if (isBrowser && lowercasedKey === 'user-agent') {
            // Some browsers do not allow overriding the user agent.
            // https://github.com/Airtable/airtable.js/issues/52
            headerKey = 'X-Airtable-User-Agent';
          } else {
            headerKey = headerDefinition.headerKey;
          }
          result[headerKey] = headerDefinition.headerValue;
        }
        return result;
      };
      return HttpHeaders;
    }());
    module.exports = HttpHeaders;
  }, { 'lodash/keys': 93 }],
  10: [function (require, module, exports) {
    module.exports = {
      INITIAL_RETRY_DELAY_IF_RATE_LIMITED: 5000,
      MAX_RETRY_DELAY_IF_RATE_LIMITED: 600000,
    };
  }, {}],
  11: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const isArray_1 = __importDefault(require('lodash/isArray'));
    const isNil_1 = __importDefault(require('lodash/isNil'));
    const keys_1 = __importDefault(require('lodash/keys'));
    /* eslint-enable @typescript-eslint/no-explicit-any */
    // Adapted from jQuery.param:
    // https://github.com/jquery/jquery/blob/2.2-stable/src/serialize.js
    function buildParams(prefix, obj, addFn) {
      if (isArray_1.default(obj)) {
        // Serialize array item.
        for (let index = 0; index < obj.length; index++) {
          var value = obj[index];
          if (/\[\]$/.test(prefix)) {
            // Treat each array item as a scalar.
            addFn(prefix, value);
          } else {
            // Item is non-scalar (array or object), encode its numeric index.
            buildParams(`${prefix}[${typeof value === 'object' && value !== null ? index : ''}]`, value, addFn);
          }
        }
      } else if (typeof obj === 'object') {
        // Serialize object item.
        for (let _i = 0, _a = keys_1.default(obj); _i < _a.length; _i++) {
          const key = _a[_i];
          var value = obj[key];
          buildParams(`${prefix}[${key}]`, value, addFn);
        }
      } else {
        // Serialize scalar item.
        addFn(prefix, obj);
      }
    }
    function objectToQueryParamString(obj) {
      const parts = [];
      const addFn = function (key, value) {
        value = isNil_1.default(value) ? '' : value;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      };
      for (let _i = 0, _a = keys_1.default(obj); _i < _a.length; _i++) {
        const key = _a[_i];
        const value = obj[key];
        buildParams(key, value, addFn);
      }
      return parts.join('&').replace(/%20/g, '+');
    }
    module.exports = objectToQueryParamString;
  }, { 'lodash/isArray': 79, 'lodash/isNil': 85, 'lodash/keys': 93 }],
  12: [function (require, module, exports) {
    module.exports = '0.12.2';
  }, {}],
  13: [function (require, module, exports) {
    var __assign = (this && this.__assign) || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (const p in s) { if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]; }
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const isFunction_1 = __importDefault(require('lodash/isFunction'));
    const keys_1 = __importDefault(require('lodash/keys'));
    const record_1 = __importDefault(require('./record'));
    const callback_to_promise_1 = __importDefault(require('./callback_to_promise'));
    const has_1 = __importDefault(require('./has'));
    const query_params_1 = require('./query_params');
    const object_to_query_param_string_1 = __importDefault(require('./object_to_query_param_string'));
    /**
     * Builds a query object. Won't fetch until `firstPage` or
     * or `eachPage` is called.
     *
     * Params should be validated prior to being passed to Query
     * with `Query.validateParams`.
     */
    const Query = /** @class */ (function () {
      function Query(table, params) {
        this._table = table;
        this._params = params;
        this.firstPage = callback_to_promise_1.default(firstPage, this);
        this.eachPage = callback_to_promise_1.default(eachPage, this, 1);
        this.all = callback_to_promise_1.default(all, this);
      }
      /**
       * Validates the parameters for passing to the Query constructor.
       *
       * @params {object} params parameters to validate
       *
       * @return an object with two keys:
       *  validParams: the object that should be passed to the constructor.
       *  ignoredKeys: a list of keys that will be ignored.
       *  errors: a list of error messages.
       */
      Query.validateParams = function (params) {
        const validParams = {};
        const ignoredKeys = [];
        const errors = [];
        for (let _i = 0, _a = keys_1.default(params); _i < _a.length; _i++) {
          const key = _a[_i];
          const value = params[key];
          if (has_1.default(Query.paramValidators, key)) {
            const validator = Query.paramValidators[key];
            const validationResult = validator(value);
            if (validationResult.pass) {
              validParams[key] = value;
            } else {
              errors.push(validationResult.error);
            }
          } else {
            ignoredKeys.push(key);
          }
        }
        return {
          validParams,
          ignoredKeys,
          errors,
        };
      };
      Query.paramValidators = query_params_1.paramValidators;
      return Query;
    }());
    /**
     * Fetches the first page of results for the query asynchronously,
     * then calls `done(error, records)`.
     */
    function firstPage(done) {
      if (!isFunction_1.default(done)) {
        throw new Error('The first parameter to `firstPage` must be a function');
      }
      this.eachPage((records) => {
        done(null, records);
      }, (error) => {
        done(error, null);
      });
    }
    /**
     * Fetches each page of results for the query asynchronously.
     *
     * Calls `pageCallback(records, fetchNextPage)` for each
     * page. You must call `fetchNextPage()` to fetch the next page of
     * results.
     *
     * After fetching all pages, or if there's an error, calls
     * `done(error)`.
     */
    function eachPage(pageCallback, done) {
      const _this = this;
      if (!isFunction_1.default(pageCallback)) {
        throw new Error('The first parameter to `eachPage` must be a function');
      }
      if (!isFunction_1.default(done) && done !== void 0) {
        throw new Error('The second parameter to `eachPage` must be a function or undefined');
      }
      const params = __assign({}, this._params);
      const pathAndParamsAsString = `/${this._table._urlEncodedNameOrId()}?${object_to_query_param_string_1.default(params)}`;
      let queryParams = {};
      let requestData = null;
      let method;
      let path;
      if (params.method === 'post' || pathAndParamsAsString.length > query_params_1.URL_CHARACTER_LENGTH_LIMIT) {
        // There is a 16kb limit on GET requests. Since the URL makes up nearly all of the request size, we check for any requests that
        // that come close to this limit and send it as a POST instead. Additionally, we'll send the request as a post if it is specified
        // with the request params
        requestData = params;
        method = 'post';
        path = `/${this._table._urlEncodedNameOrId()}/listRecords`;
        const paramNames = Object.keys(params);
        for (let _i = 0, paramNames_1 = paramNames; _i < paramNames_1.length; _i++) {
          const paramName = paramNames_1[_i];
          if (query_params_1.shouldListRecordsParamBePassedAsParameter(paramName)) {
            // timeZone and userLocale is parsed from the GET request separately from the other params. This parsing
            // does not occurring within the body parser we use for POST requests, so this will still need to be passed
            // via query params
            queryParams[paramName] = params[paramName];
          } else {
            requestData[paramName] = params[paramName];
          }
        }
      } else {
        method = 'get';
        queryParams = params;
        path = `/${this._table._urlEncodedNameOrId()}`;
      }
      var inner = function () {
        _this._table._base.runAction(method, path, queryParams, requestData, (err, response, result) => {
          if (err) {
            done(err, null);
          } else {
            let next = void 0;
            if (result.offset) {
              params.offset = result.offset;
              next = inner;
            } else {
              next = function () {
                done(null);
              };
            }
            const records = result.records.map((recordJson) => {
              return new record_1.default(_this._table, null, recordJson);
            });
            pageCallback(records, next);
          }
        });
      };
      inner();
    }
    /**
     * Fetches all pages of results asynchronously. May take a long time.
     */
    function all(done) {
      if (!isFunction_1.default(done)) {
        throw new Error('The first parameter to `all` must be a function');
      }
      const allRecords = [];
      this.eachPage((pageRecords, fetchNextPage) => {
        allRecords.push.apply(allRecords, pageRecords);
        fetchNextPage();
      }, (err) => {
        if (err) {
          done(err, null);
        } else {
          done(null, allRecords);
        }
      });
    }
    module.exports = Query;
  }, {
    './callback_to_promise': 4, './has': 8, './object_to_query_param_string': 11, './query_params': 14, './record': 15, 'lodash/isFunction': 83, 'lodash/keys': 93,
  }],
  14: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    Object.defineProperty(exports, '__esModule', { value: true });
    exports.shouldListRecordsParamBePassedAsParameter = exports.URL_CHARACTER_LENGTH_LIMIT = exports.paramValidators = void 0;
    const typecheck_1 = __importDefault(require('./typecheck'));
    const isString_1 = __importDefault(require('lodash/isString'));
    const isNumber_1 = __importDefault(require('lodash/isNumber'));
    const isPlainObject_1 = __importDefault(require('lodash/isPlainObject'));
    const isBoolean_1 = __importDefault(require('lodash/isBoolean'));
    exports.paramValidators = {
      fields: typecheck_1.default(typecheck_1.default.isArrayOf(isString_1.default), 'the value for `fields` should be an array of strings'),
      filterByFormula: typecheck_1.default(isString_1.default, 'the value for `filterByFormula` should be a string'),
      maxRecords: typecheck_1.default(isNumber_1.default, 'the value for `maxRecords` should be a number'),
      pageSize: typecheck_1.default(isNumber_1.default, 'the value for `pageSize` should be a number'),
      offset: typecheck_1.default(isNumber_1.default, 'the value for `offset` should be a number'),
      sort: typecheck_1.default(typecheck_1.default.isArrayOf((obj) => {
        return (isPlainObject_1.default(obj)
          && isString_1.default(obj.field)
          && (obj.direction === void 0 || ['asc', 'desc'].includes(obj.direction)));
      }), 'the value for `sort` should be an array of sort objects. '
      + 'Each sort object must have a string `field` value, and an optional '
      + '`direction` value that is "asc" or "desc".'),
      view: typecheck_1.default(isString_1.default, 'the value for `view` should be a string'),
      cellFormat: typecheck_1.default((cellFormat) => {
        return isString_1.default(cellFormat) && ['json', 'string'].includes(cellFormat);
      }, 'the value for `cellFormat` should be "json" or "string"'),
      timeZone: typecheck_1.default(isString_1.default, 'the value for `timeZone` should be a string'),
      userLocale: typecheck_1.default(isString_1.default, 'the value for `userLocale` should be a string'),
      method: typecheck_1.default((method) => {
        return isString_1.default(method) && ['get', 'post'].includes(method);
      }, 'the value for `method` should be "get" or "post"'),
      returnFieldsByFieldId: typecheck_1.default(isBoolean_1.default, 'the value for `returnFieldsByFieldId` should be a boolean'),
      recordMetadata: typecheck_1.default(typecheck_1.default.isArrayOf(isString_1.default), 'the value for `recordMetadata` should be an array of strings'),
    };
    exports.URL_CHARACTER_LENGTH_LIMIT = 15000;
    exports.shouldListRecordsParamBePassedAsParameter = function (paramName) {
      return paramName === 'timeZone' || paramName === 'userLocale';
    };
  }, {
    './typecheck': 18, 'lodash/isBoolean': 81, 'lodash/isNumber': 86, 'lodash/isPlainObject': 89, 'lodash/isString': 90,
  }],
  15: [function (require, module, exports) {
    var __assign = (this && this.__assign) || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (const p in s) { if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]; }
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const callback_to_promise_1 = __importDefault(require('./callback_to_promise'));
    const Record = /** @class */ (function () {
      function Record(table, recordId, recordJson) {
        this._table = table;
        this.id = recordId || recordJson.id;
        if (recordJson) {
          this.commentCount = recordJson.commentCount;
        }
        this.setRawJson(recordJson);
        this.save = callback_to_promise_1.default(save, this);
        this.patchUpdate = callback_to_promise_1.default(patchUpdate, this);
        this.putUpdate = callback_to_promise_1.default(putUpdate, this);
        this.destroy = callback_to_promise_1.default(destroy, this);
        this.fetch = callback_to_promise_1.default(fetch, this);
        this.updateFields = this.patchUpdate;
        this.replaceFields = this.putUpdate;
      }
      Record.prototype.getId = function () {
        return this.id;
      };
      Record.prototype.get = function (columnName) {
        return this.fields[columnName];
      };
      Record.prototype.set = function (columnName, columnValue) {
        this.fields[columnName] = columnValue;
      };
      Record.prototype.setRawJson = function (rawJson) {
        this._rawJson = rawJson;
        this.fields = (this._rawJson && this._rawJson.fields) || {};
      };
      return Record;
    }());
    function save(done) {
      this.putUpdate(this.fields, done);
    }
    function patchUpdate(cellValuesByName, opts, done) {
      const _this = this;
      if (!done) {
        done = opts;
        opts = {};
      }
      const updateBody = __assign({ fields: cellValuesByName }, opts);
      this._table._base.runAction('patch', `/${this._table._urlEncodedNameOrId()}/${this.id}`, {}, updateBody, (err, response, results) => {
        if (err) {
          done(err);
          return;
        }
        _this.setRawJson(results);
        done(null, _this);
      });
    }
    function putUpdate(cellValuesByName, opts, done) {
      const _this = this;
      if (!done) {
        done = opts;
        opts = {};
      }
      const updateBody = __assign({ fields: cellValuesByName }, opts);
      this._table._base.runAction('put', `/${this._table._urlEncodedNameOrId()}/${this.id}`, {}, updateBody, (err, response, results) => {
        if (err) {
          done(err);
          return;
        }
        _this.setRawJson(results);
        done(null, _this);
      });
    }
    function destroy(done) {
      const _this = this;
      this._table._base.runAction('delete', `/${this._table._urlEncodedNameOrId()}/${this.id}`, {}, null, (err) => {
        if (err) {
          done(err);
          return;
        }
        done(null, _this);
      });
    }
    function fetch(done) {
      const _this = this;
      this._table._base.runAction('get', `/${this._table._urlEncodedNameOrId()}/${this.id}`, {}, null, (err, response, results) => {
        if (err) {
          done(err);
          return;
        }
        _this.setRawJson(results);
        done(null, _this);
      });
    }
    module.exports = Record;
  }, { './callback_to_promise': 4 }],
  16: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const exponential_backoff_with_jitter_1 = __importDefault(require('./exponential_backoff_with_jitter'));
    const object_to_query_param_string_1 = __importDefault(require('./object_to_query_param_string'));
    const package_version_1 = __importDefault(require('./package_version'));
    const fetch_1 = __importDefault(require('./fetch'));
    const abort_controller_1 = __importDefault(require('./abort-controller'));
    const userAgent = `Airtable.js/${package_version_1.default}`;
    function runAction(base, method, path, queryParams, bodyData, callback, numAttempts) {
      const url = `${base._airtable._endpointUrl}/v${base._airtable._apiVersionMajor}/${base._id}${path}?${object_to_query_param_string_1.default(queryParams)}`;
      const headers = {
        authorization: `Bearer ${base._airtable._apiKey}`,
        'x-api-version': base._airtable._apiVersion,
        'x-airtable-application-id': base.getId(),
        'content-type': 'application/json',
      };
      const isBrowser = typeof window !== 'undefined';
      // Some browsers do not allow overriding the user agent.
      // https://github.com/Airtable/airtable.js/issues/52
      if (isBrowser) {
        headers['x-airtable-user-agent'] = userAgent;
      } else {
        headers['User-Agent'] = userAgent;
      }
      const controller = new abort_controller_1.default();
      const normalizedMethod = method.toUpperCase();
      const options = {
        method: normalizedMethod,
        headers,
        signal: controller.signal,
      };
      if (bodyData !== null) {
        if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') {
          console.warn('body argument to runAction are ignored with GET or HEAD requests');
        } else {
          options.body = JSON.stringify(bodyData);
        }
      }
      const timeout = setTimeout(() => {
        controller.abort();
      }, base._airtable._requestTimeout);
      fetch_1.default(url, options)
        .then((resp) => {
          clearTimeout(timeout);
          if (resp.status === 429 && !base._airtable._noRetryIfRateLimited) {
            const backoffDelayMs = exponential_backoff_with_jitter_1.default(numAttempts);
            setTimeout(() => {
              runAction(base, method, path, queryParams, bodyData, callback, numAttempts + 1);
            }, backoffDelayMs);
          } else {
            resp.json()
              .then((body) => {
                const error = base._checkStatusForError(resp.status, body);
                // Ensure Response interface matches interface from
                // `request` Response object
                const r = {};
                Object.keys(resp).forEach((property) => {
                  r[property] = resp[property];
                });
                r.body = body;
                r.statusCode = resp.status;
                callback(error, r, body);
              })
              .catch(() => {
                callback(base._checkStatusForError(resp.status));
              });
          }
        })
        .catch((error) => {
          clearTimeout(timeout);
          callback(error);
        });
    }
    module.exports = runAction;
  }, {
    './abort-controller': 1, './exponential_backoff_with_jitter': 6, './fetch': 7, './object_to_query_param_string': 11, './package_version': 12,
  }],
  17: [function (require, module, exports) {
    var __assign = (this && this.__assign) || function () {
      __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (const p in s) { if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]; }
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const isPlainObject_1 = __importDefault(require('lodash/isPlainObject'));
    const deprecate_1 = __importDefault(require('./deprecate'));
    const query_1 = __importDefault(require('./query'));
    const query_params_1 = require('./query_params');
    const object_to_query_param_string_1 = __importDefault(require('./object_to_query_param_string'));
    const record_1 = __importDefault(require('./record'));
    const callback_to_promise_1 = __importDefault(require('./callback_to_promise'));
    const Table = /** @class */ (function () {
      function Table(base, tableId, tableName) {
        if (!tableId && !tableName) {
          throw new Error('Table name or table ID is required');
        }
        this._base = base;
        this.id = tableId;
        this.name = tableName;
        // Public API
        this.find = callback_to_promise_1.default(this._findRecordById, this);
        this.select = this._selectRecords.bind(this);
        this.create = callback_to_promise_1.default(this._createRecords, this);
        this.update = callback_to_promise_1.default(this._updateRecords.bind(this, false), this);
        this.replace = callback_to_promise_1.default(this._updateRecords.bind(this, true), this);
        this.destroy = callback_to_promise_1.default(this._destroyRecord, this);
        // Deprecated API
        this.list = deprecate_1.default(this._listRecords.bind(this), 'table.list', 'Airtable: `list()` is deprecated. Use `select()` instead.');
        this.forEach = deprecate_1.default(this._forEachRecord.bind(this), 'table.forEach', 'Airtable: `forEach()` is deprecated. Use `select()` instead.');
      }
      Table.prototype._findRecordById = function (recordId, done) {
        const record = new record_1.default(this, recordId);
        record.fetch(done);
      };
      Table.prototype._selectRecords = function (params) {
        if (params === void 0) {
          params = {};
        }
        if (arguments.length > 1) {
          console.warn(`Airtable: \`select\` takes only one parameter, but it was given ${arguments.length} parameters. Use \`eachPage\` or \`firstPage\` to fetch records.`);
        }
        if (isPlainObject_1.default(params)) {
          const validationResults = query_1.default.validateParams(params);
          if (validationResults.errors.length) {
            const formattedErrors = validationResults.errors.map((error) => {
              return `  * ${error}`;
            });
            throw new Error(`Airtable: invalid parameters for \`select\`:\n${formattedErrors.join('\n')}`);
          }
          if (validationResults.ignoredKeys.length) {
            console.warn(`Airtable: the following parameters to \`select\` will be ignored: ${validationResults.ignoredKeys.join(', ')}`);
          }
          return new query_1.default(this, validationResults.validParams);
        }

        throw new Error('Airtable: the parameter for `select` should be a plain object or undefined.');
      };
      Table.prototype._urlEncodedNameOrId = function () {
        return this.id || encodeURIComponent(this.name);
      };
      Table.prototype._createRecords = function (recordsData, optionalParameters, done) {
        const _this = this;
        const isCreatingMultipleRecords = Array.isArray(recordsData);
        if (!done) {
          done = optionalParameters;
          optionalParameters = {};
        }
        let requestData;
        if (isCreatingMultipleRecords) {
          requestData = __assign({ records: recordsData }, optionalParameters);
        } else {
          requestData = __assign({ fields: recordsData }, optionalParameters);
        }
        this._base.runAction('post', `/${this._urlEncodedNameOrId()}/`, {}, requestData, (err, resp, body) => {
          if (err) {
            done(err);
            return;
          }
          let result;
          if (isCreatingMultipleRecords) {
            result = body.records.map((record) => {
              return new record_1.default(_this, record.id, record);
            });
          } else {
            result = new record_1.default(_this, body.id, body);
          }
          done(null, result);
        });
      };
      Table.prototype._updateRecords = function (isDestructiveUpdate, recordsDataOrRecordId, recordDataOrOptsOrDone, optsOrDone, done) {
        const _this = this;
        let opts;
        if (Array.isArray(recordsDataOrRecordId)) {
          const recordsData = recordsDataOrRecordId;
          opts = isPlainObject_1.default(recordDataOrOptsOrDone) ? recordDataOrOptsOrDone : {};
          done = (optsOrDone || recordDataOrOptsOrDone);
          const method = isDestructiveUpdate ? 'put' : 'patch';
          const requestData = __assign({ records: recordsData }, opts);
          this._base.runAction(method, `/${this._urlEncodedNameOrId()}/`, {}, requestData, (err, resp, body) => {
            if (err) {
              done(err);
              return;
            }
            const result = body.records.map((record) => {
              return new record_1.default(_this, record.id, record);
            });
            done(null, result);
          });
        } else {
          const recordId = recordsDataOrRecordId;
          const recordData = recordDataOrOptsOrDone;
          opts = isPlainObject_1.default(optsOrDone) ? optsOrDone : {};
          done = (done || optsOrDone);
          const record = new record_1.default(this, recordId);
          if (isDestructiveUpdate) {
            record.putUpdate(recordData, opts, done);
          } else {
            record.patchUpdate(recordData, opts, done);
          }
        }
      };
      Table.prototype._destroyRecord = function (recordIdsOrId, done) {
        const _this = this;
        if (Array.isArray(recordIdsOrId)) {
          const queryParams = { records: recordIdsOrId };
          this._base.runAction('delete', `/${this._urlEncodedNameOrId()}`, queryParams, null, (err, response, results) => {
            if (err) {
              done(err);
              return;
            }
            const records = results.records.map((_a) => {
              const { id } = _a;
              return new record_1.default(_this, id, null);
            });
            done(null, records);
          });
        } else {
          const record = new record_1.default(this, recordIdsOrId);
          record.destroy(done);
        }
      };
      Table.prototype._listRecords = function (pageSize, offset, opts, done) {
        const _this = this;
        if (!done) {
          done = opts;
          opts = {};
        }
        const pathAndParamsAsString = `/${this._urlEncodedNameOrId()}?${object_to_query_param_string_1.default(opts)}`;
        let path;
        let listRecordsParameters = {};
        let listRecordsData = null;
        let method;
        if ((typeof opts !== 'function' && opts.method === 'post')
          || pathAndParamsAsString.length > query_params_1.URL_CHARACTER_LENGTH_LIMIT) {
          // // There is a 16kb limit on GET requests. Since the URL makes up nearly all of the request size, we check for any requests that
          // that come close to this limit and send it as a POST instead. Additionally, we'll send the request as a post if it is specified
          // with the request params
          path = `/${this._urlEncodedNameOrId()}/listRecords`;
          listRecordsData = __assign(__assign({}, (pageSize && { pageSize })), (offset && { offset }));
          method = 'post';
          const paramNames = Object.keys(opts);
          for (let _i = 0, paramNames_1 = paramNames; _i < paramNames_1.length; _i++) {
            const paramName = paramNames_1[_i];
            if (query_params_1.shouldListRecordsParamBePassedAsParameter(paramName)) {
              listRecordsParameters[paramName] = opts[paramName];
            } else {
              listRecordsData[paramName] = opts[paramName];
            }
          }
        } else {
          method = 'get';
          path = `/${this._urlEncodedNameOrId()}/`;
          listRecordsParameters = __assign({ limit: pageSize, offset }, opts);
        }
        this._base.runAction(method, path, listRecordsParameters, listRecordsData, (err, response, results) => {
          if (err) {
            done(err);
            return;
          }
          const records = results.records.map((recordJson) => {
            return new record_1.default(_this, null, recordJson);
          });
          done(null, records, results.offset);
        });
      };
      Table.prototype._forEachRecord = function (opts, callback, done) {
        const _this = this;
        if (arguments.length === 2) {
          done = callback;
          callback = opts;
          opts = {};
        }
        const limit = Table.__recordsPerPageForIteration || 100;
        let offset = null;
        var nextPage = function () {
          _this._listRecords(limit, offset, opts, (err, page, newOffset) => {
            if (err) {
              done(err);
              return;
            }
            for (let index = 0; index < page.length; index++) {
              callback(page[index]);
            }
            if (newOffset) {
              offset = newOffset;
              nextPage();
            } else {
              done();
            }
          });
        };
        nextPage();
      };
      return Table;
    }());
    module.exports = Table;
  }, {
    './callback_to_promise': 4, './deprecate': 5, './object_to_query_param_string': 11, './query': 13, './query_params': 14, './record': 15, 'lodash/isPlainObject': 89,
  }],
  18: [function (require, module, exports) {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    function check(fn, error) {
      return function (value) {
        if (fn(value)) {
          return { pass: true };
        }

        return { pass: false, error };
      };
    }
    check.isOneOf = function isOneOf(options) {
      return options.includes.bind(options);
    };
    check.isArrayOf = function (itemValidator) {
      return function (value) {
        return Array.isArray(value) && value.every(itemValidator);
      };
    };
    module.exports = check;
  }, {}],
  19: [function (require, module, exports) {
    Object.defineProperty(exports, '__esModule', { value: true });

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError('Cannot call a class as a function');
      }
    }

    function _defineProperties(target, props) {
      for (let i = 0; i < props.length; i++) {
        const descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    function _inherits(subClass, superClass) {
      if (typeof superClass !== 'function' && superClass !== null) {
        throw new TypeError('Super expression must either be null or a function');
      }

      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          writable: true,
          configurable: true,
        },
      });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }

    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
      };
      return _getPrototypeOf(o);
    }

    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };

      return _setPrototypeOf(o, p);
    }

    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }

      return self;
    }

    function _possibleConstructorReturn(self, call) {
      if (call && (typeof call === 'object' || typeof call === 'function')) {
        return call;
      }

      return _assertThisInitialized(self);
    }

    function _superPropBase(object, property) {
      while (!Object.prototype.hasOwnProperty.call(object, property)) {
        object = _getPrototypeOf(object);
        if (object === null) break;
      }

      return object;
    }

    function _get(target, property, receiver) {
      if (typeof Reflect !== 'undefined' && Reflect.get) {
        _get = Reflect.get;
      } else {
        _get = function _get(target, property, receiver) {
          const base = _superPropBase(target, property);

          if (!base) return;
          const desc = Object.getOwnPropertyDescriptor(base, property);

          if (desc.get) {
            return desc.get.call(receiver);
          }

          return desc.value;
        };
      }

      return _get(target, property, receiver || target);
    }

    const Emitter =
      /* #__PURE__ */
      (function () {
        function Emitter() {
          _classCallCheck(this, Emitter);

          Object.defineProperty(this, 'listeners', {
            value: {},
            writable: true,
            configurable: true,
          });
        }

        _createClass(Emitter, [{
          key: 'addEventListener',
          value: function addEventListener(type, callback) {
            if (!(type in this.listeners)) {
              this.listeners[type] = [];
            }

            this.listeners[type].push(callback);
          },
        }, {
          key: 'removeEventListener',
          value: function removeEventListener(type, callback) {
            if (!(type in this.listeners)) {
              return;
            }

            const stack = this.listeners[type];

            for (let i = 0, l = stack.length; i < l; i++) {
              if (stack[i] === callback) {
                stack.splice(i, 1);
                return;
              }
            }
          },
        }, {
          key: 'dispatchEvent',
          value: function dispatchEvent(event) {
            const _this = this;

            if (!(event.type in this.listeners)) {
              return;
            }

            const debounce = function debounce(callback) {
              setTimeout(() => {
                return callback.call(_this, event);
              });
            };

            const stack = this.listeners[event.type];

            for (let i = 0, l = stack.length; i < l; i++) {
              debounce(stack[i]);
            }

            return !event.defaultPrevented;
          },
        }]);

        return Emitter;
      }());

    const AbortSignal =
      /* #__PURE__ */
      (function (_Emitter) {
        _inherits(AbortSignal, _Emitter);

        function AbortSignal() {
          let _this2;

          _classCallCheck(this, AbortSignal);

          _this2 = _possibleConstructorReturn(this, _getPrototypeOf(AbortSignal).call(this)); // Some versions of babel does not transpile super() correctly for IE <= 10, if the parent
          // constructor has failed to run, then "this.listeners" will still be undefined and then we call
          // the parent constructor directly instead as a workaround. For general details, see babel bug:
          // https://github.com/babel/babel/issues/3041
          // This hack was added as a fix for the issue described here:
          // https://github.com/Financial-Times/polyfill-library/pull/59#issuecomment-477558042

          if (!_this2.listeners) {
            Emitter.call(_assertThisInitialized(_this2));
          } // Compared to assignment, Object.defineProperty makes properties non-enumerable by default and
          // we want Object.keys(new AbortController().signal) to be [] for compat with the native impl


          Object.defineProperty(_assertThisInitialized(_this2), 'aborted', {
            value: false,
            writable: true,
            configurable: true,
          });
          Object.defineProperty(_assertThisInitialized(_this2), 'onabort', {
            value: null,
            writable: true,
            configurable: true,
          });
          return _this2;
        }

        _createClass(AbortSignal, [{
          key: 'toString',
          value: function toString() {
            return '[object AbortSignal]';
          },
        }, {
          key: 'dispatchEvent',
          value: function dispatchEvent(event) {
            if (event.type === 'abort') {
              this.aborted = true;

              if (typeof this.onabort === 'function') {
                this.onabort.call(this, event);
              }
            }

            _get(_getPrototypeOf(AbortSignal.prototype), 'dispatchEvent', this).call(this, event);
          },
        }]);

        return AbortSignal;
      }(Emitter));
    const AbortController =
      /* #__PURE__ */
      (function () {
        function AbortController() {
          _classCallCheck(this, AbortController);

          // Compared to assignment, Object.defineProperty makes properties non-enumerable by default and
          // we want Object.keys(new AbortController()) to be [] for compat with the native impl
          Object.defineProperty(this, 'signal', {
            value: new AbortSignal(),
            writable: true,
            configurable: true,
          });
        }

        _createClass(AbortController, [{
          key: 'abort',
          value: function abort() {
            let event;

            try {
              event = new Event('abort');
            } catch (e) {
              if (typeof document !== 'undefined') {
                if (!document.createEvent) {
                  // For Internet Explorer 8:
                  event = document.createEventObject();
                  event.type = 'abort';
                } else {
                  // For Internet Explorer 11:
                  event = document.createEvent('Event');
                  event.initEvent('abort', false, false);
                }
              } else {
                // Fallback where document isn't available:
                event = {
                  type: 'abort',
                  bubbles: false,
                  cancelable: false,
                };
              }
            }

            this.signal.dispatchEvent(event);
          },
        }, {
          key: 'toString',
          value: function toString() {
            return '[object AbortController]';
          },
        }]);

        return AbortController;
      }());

    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      // These are necessary to make sure that we get correct output for:
      // Object.prototype.toString.call(new AbortController())
      AbortController.prototype[Symbol.toStringTag] = 'AbortController';
      AbortSignal.prototype[Symbol.toStringTag] = 'AbortSignal';
    }

    function polyfillNeeded(self) {
      if (self.__FORCE_INSTALL_ABORTCONTROLLER_POLYFILL) {
        console.log('__FORCE_INSTALL_ABORTCONTROLLER_POLYFILL=true is set, will force install polyfill');
        return true;
      } // Note that the "unfetch" minimal fetch polyfill defines fetch() without
      // defining window.Request, and this polyfill need to work on top of unfetch
      // so the below feature detection needs the !self.AbortController part.
      // The Request.prototype check is also needed because Safari versions 11.1.2
      // up to and including 12.1.x has a window.AbortController present but still
      // does NOT correctly implement abortable fetch:
      // https://bugs.webkit.org/show_bug.cgi?id=174980#c2


      return typeof self.Request === 'function' && !self.Request.prototype.hasOwnProperty('signal') || !self.AbortController;
    }

    /**
     * Note: the "fetch.Request" default value is available for fetch imported from
     * the "node-fetch" package and not in browsers. This is OK since browsers
     * will be importing umd-polyfill.js from that path "self" is passed the
     * decorator so the default value will not be used (because browsers that define
     * fetch also has Request). One quirky setup where self.fetch exists but
     * self.Request does not is when the "unfetch" minimal fetch polyfill is used
     * on top of IE11; for this case the browser will try to use the fetch.Request
     * default value which in turn will be undefined but then then "if (Request)"
     * will ensure that you get a patched fetch but still no Request (as expected).
     * @param {fetch, Request = fetch.Request}
     * @returns {fetch: abortableFetch, Request: AbortableRequest}
     */

    function abortableFetchDecorator(patchTargets) {
      if (typeof patchTargets === 'function') {
        patchTargets = {
          fetch: patchTargets,
        };
      }

      const _patchTargets = patchTargets;
      const { fetch } = _patchTargets;
      const _patchTargets$Request = _patchTargets.Request;
      const NativeRequest = _patchTargets$Request === void 0 ? fetch.Request : _patchTargets$Request;
      const NativeAbortController = _patchTargets.AbortController;
      const _patchTargets$__FORCE = _patchTargets.__FORCE_INSTALL_ABORTCONTROLLER_POLYFILL;
      const __FORCE_INSTALL_ABORTCONTROLLER_POLYFILL = _patchTargets$__FORCE === void 0 ? false : _patchTargets$__FORCE;

      if (!polyfillNeeded({
        fetch,
        Request: NativeRequest,
        AbortController: NativeAbortController,
        __FORCE_INSTALL_ABORTCONTROLLER_POLYFILL,
      })) {
        return {
          fetch,
          Request,
        };
      }

      var Request = NativeRequest; // Note that the "unfetch" minimal fetch polyfill defines fetch() without
      // defining window.Request, and this polyfill need to work on top of unfetch
      // hence we only patch it if it's available. Also we don't patch it if signal
      // is already available on the Request prototype because in this case support
      // is present and the patching below can cause a crash since it assigns to
      // request.signal which is technically a read-only property. This latter error
      // happens when you run the main5.js node-fetch example in the repo
      // "abortcontroller-polyfill-examples". The exact error is:
      //   request.signal = init.signal;
      //   ^
      // TypeError: Cannot set property signal of #<Request> which has only a getter

      if (Request && !Request.prototype.hasOwnProperty('signal') || __FORCE_INSTALL_ABORTCONTROLLER_POLYFILL) {
        Request = function Request(input, init) {
          let signal;

          if (init && init.signal) {
            signal = init.signal; // Never pass init.signal to the native Request implementation when the polyfill has
            // been installed because if we're running on top of a browser with a
            // working native AbortController (i.e. the polyfill was installed due to
            // __FORCE_INSTALL_ABORTCONTROLLER_POLYFILL being set), then passing our
            // fake AbortSignal to the native fetch will trigger:
            // TypeError: Failed to construct 'Request': member signal is not of type AbortSignal.

            delete init.signal;
          }

          const request = new NativeRequest(input, init);

          if (signal) {
            Object.defineProperty(request, 'signal', {
              writable: false,
              enumerable: false,
              configurable: true,
              value: signal,
            });
          }

          return request;
        };

        Request.prototype = NativeRequest.prototype;
      }

      const realFetch = fetch;

      const abortableFetch = function abortableFetch(input, init) {
        const signal = Request && Request.prototype.isPrototypeOf(input) ? input.signal : init ? init.signal : undefined;

        if (signal) {
          let abortError;

          try {
            abortError = new DOMException('Aborted', 'AbortError');
          } catch (err) {
            // IE 11 does not support calling the DOMException constructor, use a
            // regular error object on it instead.
            abortError = new Error('Aborted');
            abortError.name = 'AbortError';
          } // Return early if already aborted, thus avoiding making an HTTP request


          if (signal.aborted) {
            return Promise.reject(abortError);
          } // Turn an event into a promise, reject it once `abort` is dispatched


          const cancellation = new Promise(((_, reject) => {
            signal.addEventListener('abort', () => {
              return reject(abortError);
            }, {
              once: true,
            });
          }));

          if (init && init.signal) {
            // Never pass .signal to the native implementation when the polyfill has
            // been installed because if we're running on top of a browser with a
            // working native AbortController (i.e. the polyfill was installed due to
            // __FORCE_INSTALL_ABORTCONTROLLER_POLYFILL being set), then passing our
            // fake AbortSignal to the native fetch will trigger:
            // TypeError: Failed to execute 'fetch' on 'Window': member signal is not of type AbortSignal.
            delete init.signal;
          } // Return the fastest promise (don't need to wait for request to finish)


          return Promise.race([cancellation, realFetch(input, init)]);
        }

        return realFetch(input, init);
      };

      return {
        fetch: abortableFetch,
        Request,
      };
    }

    exports.AbortController = AbortController;
    exports.AbortSignal = AbortSignal;
    exports.abortableFetch = abortableFetchDecorator;
  }, {}],
  20: [function (require, module, exports) {

  }, {}],
  21: [function (require, module, exports) {
    const hashClear = require('./_hashClear');
    const hashDelete = require('./_hashDelete');
    const hashGet = require('./_hashGet');
    const hashHas = require('./_hashHas');
    const hashSet = require('./_hashSet');

    /**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Hash(entries) {
      let index = -1;
      const length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        const entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `Hash`.
    Hash.prototype.clear = hashClear;
    Hash.prototype.delete = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;

    module.exports = Hash;
  }, {
    './_hashClear': 46, './_hashDelete': 47, './_hashGet': 48, './_hashHas': 49, './_hashSet': 50,
  }],
  22: [function (require, module, exports) {
    const listCacheClear = require('./_listCacheClear');
    const listCacheDelete = require('./_listCacheDelete');
    const listCacheGet = require('./_listCacheGet');
    const listCacheHas = require('./_listCacheHas');
    const listCacheSet = require('./_listCacheSet');

    /**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function ListCache(entries) {
      let index = -1;
      const length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        const entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `ListCache`.
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype.delete = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;

    module.exports = ListCache;
  }, {
    './_listCacheClear': 56, './_listCacheDelete': 57, './_listCacheGet': 58, './_listCacheHas': 59, './_listCacheSet': 60,
  }],
  23: [function (require, module, exports) {
    const getNative = require('./_getNative');
    const root = require('./_root');

    /* Built-in method references that are verified to be native. */
    const Map = getNative(root, 'Map');

    module.exports = Map;
  }, { './_getNative': 42, './_root': 72 }],
  24: [function (require, module, exports) {
    const mapCacheClear = require('./_mapCacheClear');
    const mapCacheDelete = require('./_mapCacheDelete');
    const mapCacheGet = require('./_mapCacheGet');
    const mapCacheHas = require('./_mapCacheHas');
    const mapCacheSet = require('./_mapCacheSet');

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function MapCache(entries) {
      let index = -1;
      const length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        const entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `MapCache`.
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype.delete = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;

    module.exports = MapCache;
  }, {
    './_mapCacheClear': 61, './_mapCacheDelete': 62, './_mapCacheGet': 63, './_mapCacheHas': 64, './_mapCacheSet': 65,
  }],
  25: [function (require, module, exports) {
    const root = require('./_root');

    /** Built-in value references. */
    const { Symbol } = root;

    module.exports = Symbol;
  }, { './_root': 72 }],
  26: [function (require, module, exports) {
    const baseTimes = require('./_baseTimes');
    const isArguments = require('./isArguments');
    const isArray = require('./isArray');
    const isBuffer = require('./isBuffer');
    const isIndex = require('./_isIndex');
    const isTypedArray = require('./isTypedArray');

    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */
    function arrayLikeKeys(value, inherited) {
      const isArr = isArray(value);
      const isArg = !isArr && isArguments(value);
      const isBuff = !isArr && !isArg && isBuffer(value);
      const isType = !isArr && !isArg && !isBuff && isTypedArray(value);
      const skipIndexes = isArr || isArg || isBuff || isType;
      const result = skipIndexes ? baseTimes(value.length, String) : [];
      const { length } = result;

      for (const key in value) {
        if ((inherited || hasOwnProperty.call(value, key))
          && !(skipIndexes && (
            // Safari 9 has enumerable `arguments.length` in strict mode.
            key == 'length'
            // Node.js 0.10 has enumerable non-index properties on buffers.
            || (isBuff && (key == 'offset' || key == 'parent'))
            // PhantomJS 2 has enumerable non-index properties on typed arrays.
            || (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset'))
            // Skip index properties.
            || isIndex(key, length)
          ))) {
          result.push(key);
        }
      }
      return result;
    }

    module.exports = arrayLikeKeys;
  }, {
    './_baseTimes': 35, './_isIndex': 51, './isArguments': 78, './isArray': 79, './isBuffer': 82, './isTypedArray': 92,
  }],
  27: [function (require, module, exports) {
    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
      let index = -1;
      const length = array == null ? 0 : array.length;
      const result = Array(length);

      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }

    module.exports = arrayMap;
  }, {}],
  28: [function (require, module, exports) {
    const eq = require('./eq');

    /**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      let { length } = array;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    module.exports = assocIndexOf;
  }, { './eq': 76 }],
  29: [function (require, module, exports) {
    const castPath = require('./_castPath');
    const toKey = require('./_toKey');

    /**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */
    function baseGet(object, path) {
      path = castPath(path, object);

      let index = 0;
      const { length } = path;

      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return (index && index == length) ? object : undefined;
    }

    module.exports = baseGet;
  }, { './_castPath': 38, './_toKey': 74 }],
  30: [function (require, module, exports) {
    const Symbol = require('./_Symbol');
    const getRawTag = require('./_getRawTag');
    const objectToString = require('./_objectToString');

    /** `Object#toString` result references. */
    const nullTag = '[object Null]';
    const undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    const symToStringTag = Symbol ? Symbol.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag && symToStringTag in Object(value))
        ? getRawTag(value)
        : objectToString(value);
    }

    module.exports = baseGetTag;
  }, { './_Symbol': 25, './_getRawTag': 44, './_objectToString': 70 }],
  31: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const argsTag = '[object Arguments]';

    /**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag;
    }

    module.exports = baseIsArguments;
  }, { './_baseGetTag': 30, './isObjectLike': 88 }],
  32: [function (require, module, exports) {
    const isFunction = require('./isFunction');
    const isMasked = require('./_isMasked');
    const isObject = require('./isObject');
    const toSource = require('./_toSource');

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    const reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to detect host constructors (Safari). */
    const reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used for built-in method references. */
    const funcProto = Function.prototype;
    const objectProto = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    const funcToString = funcProto.toString;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /** Used to detect if a method is native. */
    const reIsNative = RegExp(`^${funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?')}$`);

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      const pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }

    module.exports = baseIsNative;
  }, {
    './_isMasked': 54, './_toSource': 75, './isFunction': 83, './isObject': 87,
  }],
  33: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isLength = require('./isLength');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const argsTag = '[object Arguments]';
    const arrayTag = '[object Array]';
    const boolTag = '[object Boolean]';
    const dateTag = '[object Date]';
    const errorTag = '[object Error]';
    const funcTag = '[object Function]';
    const mapTag = '[object Map]';
    const numberTag = '[object Number]';
    const objectTag = '[object Object]';
    const regexpTag = '[object RegExp]';
    const setTag = '[object Set]';
    const stringTag = '[object String]';
    const weakMapTag = '[object WeakMap]';

    const arrayBufferTag = '[object ArrayBuffer]';
    const dataViewTag = '[object DataView]';
    const float32Tag = '[object Float32Array]';
    const float64Tag = '[object Float64Array]';
    const int8Tag = '[object Int8Array]';
    const int16Tag = '[object Int16Array]';
    const int32Tag = '[object Int32Array]';
    const uint8Tag = '[object Uint8Array]';
    const uint8ClampedTag = '[object Uint8ClampedArray]';
    const uint16Tag = '[object Uint16Array]';
    const uint32Tag = '[object Uint32Array]';

    /** Used to identify `toStringTag` values of typed arrays. */
    const typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

    /**
     * The base implementation of `_.isTypedArray` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     */
    function baseIsTypedArray(value) {
      return isObjectLike(value)
        && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }

    module.exports = baseIsTypedArray;
  }, { './_baseGetTag': 30, './isLength': 84, './isObjectLike': 88 }],
  34: [function (require, module, exports) {
    const isPrototype = require('./_isPrototype');
    const nativeKeys = require('./_nativeKeys');

    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      const result = [];
      for (const key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != 'constructor') {
          result.push(key);
        }
      }
      return result;
    }

    module.exports = baseKeys;
  }, { './_isPrototype': 55, './_nativeKeys': 68 }],
  35: [function (require, module, exports) {
    /**
     * The base implementation of `_.times` without support for iteratee shorthands
     * or max array length checks.
     *
     * @private
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     */
    function baseTimes(n, iteratee) {
      let index = -1;
      const result = Array(n);

      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }

    module.exports = baseTimes;
  }, {}],
  36: [function (require, module, exports) {
    const Symbol = require('./_Symbol');
    const arrayMap = require('./_arrayMap');
    const isArray = require('./isArray');
    const isSymbol = require('./isSymbol');

    /** Used as references for various `Number` constants. */
    const INFINITY = 1 / 0;

    /** Used to convert symbols to primitives and strings. */
    const symbolProto = Symbol ? Symbol.prototype : undefined;
    const symbolToString = symbolProto ? symbolProto.toString : undefined;

    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value === 'string') {
        return value;
      }
      if (isArray(value)) {
        // Recursively convert values (susceptible to call stack limits).
        return `${arrayMap(value, baseToString)}`;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      const result = (`${value}`);
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    module.exports = baseToString;
  }, {
    './_Symbol': 25, './_arrayMap': 27, './isArray': 79, './isSymbol': 91,
  }],
  37: [function (require, module, exports) {
    /**
     * The base implementation of `_.unary` without support for storing metadata.
     *
     * @private
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     */
    function baseUnary(func) {
      return function (value) {
        return func(value);
      };
    }

    module.exports = baseUnary;
  }, {}],
  38: [function (require, module, exports) {
    const isArray = require('./isArray');
    const isKey = require('./_isKey');
    const stringToPath = require('./_stringToPath');
    const toString = require('./toString');

    /**
     * Casts `value` to a path array if it's not one.
     *
     * @private
     * @param {*} value The value to inspect.
     * @param {Object} [object] The object to query keys on.
     * @returns {Array} Returns the cast property path array.
     */
    function castPath(value, object) {
      if (isArray(value)) {
        return value;
      }
      return isKey(value, object) ? [value] : stringToPath(toString(value));
    }

    module.exports = castPath;
  }, {
    './_isKey': 52, './_stringToPath': 73, './isArray': 79, './toString': 96,
  }],
  39: [function (require, module, exports) {
    const root = require('./_root');

    /** Used to detect overreaching core-js shims. */
    const coreJsData = root['__core-js_shared__'];

    module.exports = coreJsData;
  }, { './_root': 72 }],
  40: [function (require, module, exports) {
    (function (global) {
      /** Detect free variable `global` from Node.js. */
      const freeGlobal = typeof global === 'object' && global && global.Object === Object && global;

      module.exports = freeGlobal;
    }).call(this, typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {});
  }, {}],
  41: [function (require, module, exports) {
    const isKeyable = require('./_isKeyable');

    /**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */
    function getMapData(map, key) {
      const data = map.__data__;
      return isKeyable(key)
        ? data[typeof key === 'string' ? 'string' : 'hash']
        : data.map;
    }

    module.exports = getMapData;
  }, { './_isKeyable': 53 }],
  42: [function (require, module, exports) {
    const baseIsNative = require('./_baseIsNative');
    const getValue = require('./_getValue');

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      const value = getValue(object, key);
      return baseIsNative(value) ? value : undefined;
    }

    module.exports = getNative;
  }, { './_baseIsNative': 32, './_getValue': 45 }],
  43: [function (require, module, exports) {
    const overArg = require('./_overArg');

    /** Built-in value references. */
    const getPrototype = overArg(Object.getPrototypeOf, Object);

    module.exports = getPrototype;
  }, { './_overArg': 71 }],
  44: [function (require, module, exports) {
    const Symbol = require('./_Symbol');

    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    const nativeObjectToString = objectProto.toString;

    /** Built-in value references. */
    const symToStringTag = Symbol ? Symbol.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      const isOwn = hasOwnProperty.call(value, symToStringTag);
      const tag = value[symToStringTag];

      try {
        value[symToStringTag] = undefined;
        var unmasked = true;
      } catch (e) { }

      const result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }

    module.exports = getRawTag;
  }, { './_Symbol': 25 }],
  45: [function (require, module, exports) {
    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    module.exports = getValue;
  }, {}],
  46: [function (require, module, exports) {
    const nativeCreate = require('./_nativeCreate');

    /**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }

    module.exports = hashClear;
  }, { './_nativeCreate': 67 }],
  47: [function (require, module, exports) {
    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(key) {
      const result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }

    module.exports = hashDelete;
  }, {}],
  48: [function (require, module, exports) {
    const nativeCreate = require('./_nativeCreate');

    /** Used to stand-in for `undefined` hash values. */
    const HASH_UNDEFINED = '__lodash_hash_undefined__';

    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(key) {
      const data = this.__data__;
      if (nativeCreate) {
        const result = data[key];
        return result === HASH_UNDEFINED ? undefined : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : undefined;
    }

    module.exports = hashGet;
  }, { './_nativeCreate': 67 }],
  49: [function (require, module, exports) {
    const nativeCreate = require('./_nativeCreate');

    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(key) {
      const data = this.__data__;
      return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
    }

    module.exports = hashHas;
  }, { './_nativeCreate': 67 }],
  50: [function (require, module, exports) {
    const nativeCreate = require('./_nativeCreate');

    /** Used to stand-in for `undefined` hash values. */
    const HASH_UNDEFINED = '__lodash_hash_undefined__';

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */
    function hashSet(key, value) {
      const data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
      return this;
    }

    module.exports = hashSet;
  }, { './_nativeCreate': 67 }],
  51: [function (require, module, exports) {
    /** Used as references for various `Number` constants. */
    const MAX_SAFE_INTEGER = 9007199254740991;

    /** Used to detect unsigned integer values. */
    const reIsUint = /^(?:0|[1-9]\d*)$/;

    /**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */
    function isIndex(value, length) {
      const type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER : length;

      return !!length
        && (type == 'number'
          || (type != 'symbol' && reIsUint.test(value)))
        && (value > -1 && value % 1 == 0 && value < length);
    }

    module.exports = isIndex;
  }, {}],
  52: [function (require, module, exports) {
    const isArray = require('./isArray');
    const isSymbol = require('./isSymbol');

    /** Used to match property names within property paths. */
    const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    const reIsPlainProp = /^\w*$/;

    /**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      const type = typeof value;
      if (type == 'number' || type == 'symbol' || type == 'boolean'
        || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value)
        || (object != null && value in Object(object));
    }

    module.exports = isKey;
  }, { './isArray': 79, './isSymbol': 91 }],
  53: [function (require, module, exports) {
    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      const type = typeof value;
      return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
        ? (value !== '__proto__')
        : (value === null);
    }

    module.exports = isKeyable;
  }, {}],
  54: [function (require, module, exports) {
    const coreJsData = require('./_coreJsData');

    /** Used to detect methods masquerading as native. */
    const maskSrcKey = (function () {
      const uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
      return uid ? (`Symbol(src)_1.${uid}`) : '';
    }());

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    module.exports = isMasked;
  }, { './_coreJsData': 39 }],
  55: [function (require, module, exports) {
    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
      const Ctor = value && value.constructor;
      const proto = (typeof Ctor === 'function' && Ctor.prototype) || objectProto;

      return value === proto;
    }

    module.exports = isPrototype;
  }, {}],
  56: [function (require, module, exports) {
    /**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }

    module.exports = listCacheClear;
  }, {}],
  57: [function (require, module, exports) {
    const assocIndexOf = require('./_assocIndexOf');

    /** Used for built-in method references. */
    const arrayProto = Array.prototype;

    /** Built-in value references. */
    const { splice } = arrayProto;

    /**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function listCacheDelete(key) {
      const data = this.__data__;
      const index = assocIndexOf(data, key);

      if (index < 0) {
        return false;
      }
      const lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }

    module.exports = listCacheDelete;
  }, { './_assocIndexOf': 28 }],
  58: [function (require, module, exports) {
    const assocIndexOf = require('./_assocIndexOf');

    /**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function listCacheGet(key) {
      const data = this.__data__;
      const index = assocIndexOf(data, key);

      return index < 0 ? undefined : data[index][1];
    }

    module.exports = listCacheGet;
  }, { './_assocIndexOf': 28 }],
  59: [function (require, module, exports) {
    const assocIndexOf = require('./_assocIndexOf');

    /**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }

    module.exports = listCacheHas;
  }, { './_assocIndexOf': 28 }],
  60: [function (require, module, exports) {
    const assocIndexOf = require('./_assocIndexOf');

    /**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */
    function listCacheSet(key, value) {
      const data = this.__data__;
      const index = assocIndexOf(data, key);

      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }

    module.exports = listCacheSet;
  }, { './_assocIndexOf': 28 }],
  61: [function (require, module, exports) {
    const Hash = require('./_Hash');
    const ListCache = require('./_ListCache');
    const Map = require('./_Map');

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        hash: new Hash(),
        map: new (Map || ListCache)(),
        string: new Hash(),
      };
    }

    module.exports = mapCacheClear;
  }, { './_Hash': 21, './_ListCache': 22, './_Map': 23 }],
  62: [function (require, module, exports) {
    const getMapData = require('./_getMapData');

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapCacheDelete(key) {
      const result = getMapData(this, key).delete(key);
      this.size -= result ? 1 : 0;
      return result;
    }

    module.exports = mapCacheDelete;
  }, { './_getMapData': 41 }],
  63: [function (require, module, exports) {
    const getMapData = require('./_getMapData');

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }

    module.exports = mapCacheGet;
  }, { './_getMapData': 41 }],
  64: [function (require, module, exports) {
    const getMapData = require('./_getMapData');

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }

    module.exports = mapCacheHas;
  }, { './_getMapData': 41 }],
  65: [function (require, module, exports) {
    const getMapData = require('./_getMapData');

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */
    function mapCacheSet(key, value) {
      const data = getMapData(this, key);
      const { size } = data;

      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }

    module.exports = mapCacheSet;
  }, { './_getMapData': 41 }],
  66: [function (require, module, exports) {
    const memoize = require('./memoize');

    /** Used as the maximum memoize cache size. */
    const MAX_MEMOIZE_SIZE = 500;

    /**
     * A specialized version of `_.memoize` which clears the memoized function's
     * cache when it exceeds `MAX_MEMOIZE_SIZE`.
     *
     * @private
     * @param {Function} func The function to have its output memoized.
     * @returns {Function} Returns the new memoized function.
     */
    function memoizeCapped(func) {
      const result = memoize(func, (key) => {
        if (cache.size === MAX_MEMOIZE_SIZE) {
          cache.clear();
        }
        return key;
      });

      var { cache } = result;
      return result;
    }

    module.exports = memoizeCapped;
  }, { './memoize': 94 }],
  67: [function (require, module, exports) {
    const getNative = require('./_getNative');

    /* Built-in method references that are verified to be native. */
    const nativeCreate = getNative(Object, 'create');

    module.exports = nativeCreate;
  }, { './_getNative': 42 }],
  68: [function (require, module, exports) {
    const overArg = require('./_overArg');

    /* Built-in method references for those with the same name as other `lodash` methods. */
    const nativeKeys = overArg(Object.keys, Object);

    module.exports = nativeKeys;
  }, { './_overArg': 71 }],
  69: [function (require, module, exports) {
    const freeGlobal = require('./_freeGlobal');

    /** Detect free variable `exports`. */
    const freeExports = typeof exports === 'object' && exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    const freeModule = freeExports && typeof module === 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    const moduleExports = freeModule && freeModule.exports === freeExports;

    /** Detect free variable `process` from Node.js. */
    const freeProcess = moduleExports && freeGlobal.process;

    /** Used to access faster Node.js helpers. */
    const nodeUtil = (function () {
      try {
        // Use `util.types` for Node.js 10+.
        const types = freeModule && freeModule.require && freeModule.require('util').types;

        if (types) {
          return types;
        }

        // Legacy `process.binding('util')` for Node.js < 10.
        return freeProcess && freeProcess.binding && freeProcess.binding('util');
      } catch (e) { }
    }());

    module.exports = nodeUtil;
  }, { './_freeGlobal': 40 }],
  70: [function (require, module, exports) {
    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    const nativeObjectToString = objectProto.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }

    module.exports = objectToString;
  }, {}],
  71: [function (require, module, exports) {
    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
      return function (arg) {
        return func(transform(arg));
      };
    }

    module.exports = overArg;
  }, {}],
  72: [function (require, module, exports) {
    const freeGlobal = require('./_freeGlobal');

    /** Detect free variable `self`. */
    const freeSelf = typeof self === 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    const root = freeGlobal || freeSelf || Function('return this')();

    module.exports = root;
  }, { './_freeGlobal': 40 }],
  73: [function (require, module, exports) {
    const memoizeCapped = require('./_memoizeCapped');

    /** Used to match property names within property paths. */
    const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

    /** Used to match backslashes in property paths. */
    const reEscapeChar = /\\(\\)?/g;

    /**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */
    const stringToPath = memoizeCapped((string) => {
      const result = [];
      if (string.charCodeAt(0) === 46 /* . */) {
        result.push('');
      }
      string.replace(rePropName, (match, number, quote, subString) => {
        result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    });

    module.exports = stringToPath;
  }, { './_memoizeCapped': 66 }],
  74: [function (require, module, exports) {
    const isSymbol = require('./isSymbol');

    /** Used as references for various `Number` constants. */
    const INFINITY = 1 / 0;

    /**
     * Converts `value` to a string key if it's not a string or symbol.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {string|symbol} Returns the key.
     */
    function toKey(value) {
      if (typeof value === 'string' || isSymbol(value)) {
        return value;
      }
      const result = (`${value}`);
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    module.exports = toKey;
  }, { './isSymbol': 91 }],
  75: [function (require, module, exports) {
    /** Used for built-in method references. */
    const funcProto = Function.prototype;

    /** Used to resolve the decompiled source of functions. */
    const funcToString = funcProto.toString;

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) { }
        try {
          return (`${func}`);
        } catch (e) { }
      }
      return '';
    }

    module.exports = toSource;
  }, {}],
  76: [function (require, module, exports) {
    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    module.exports = eq;
  }, {}],
  77: [function (require, module, exports) {
    const baseGet = require('./_baseGet');

    /**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined`, the `defaultValue` is returned in its place.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */
    function get(object, path, defaultValue) {
      const result = object == null ? undefined : baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    module.exports = get;
  }, { './_baseGet': 29 }],
  78: [function (require, module, exports) {
    const baseIsArguments = require('./_baseIsArguments');
    const isObjectLike = require('./isObjectLike');

    /** Used for built-in method references. */
    const objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /** Built-in value references. */
    const { propertyIsEnumerable } = objectProto;

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    const isArguments = baseIsArguments(function () { return arguments; }()) ? baseIsArguments : function (value) {
      return isObjectLike(value) && hasOwnProperty.call(value, 'callee')
        && !propertyIsEnumerable.call(value, 'callee');
    };

    module.exports = isArguments;
  }, { './_baseIsArguments': 31, './isObjectLike': 88 }],
  79: [function (require, module, exports) {
    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    const { isArray } = Array;

    module.exports = isArray;
  }, {}],
  80: [function (require, module, exports) {
    const isFunction = require('./isFunction');
    const isLength = require('./isLength');

    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }

    module.exports = isArrayLike;
  }, { './isFunction': 83, './isLength': 84 }],
  81: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const boolTag = '[object Boolean]';

    /**
     * Checks if `value` is classified as a boolean primitive or object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a boolean, else `false`.
     * @example
     *
     * _.isBoolean(false);
     * // => true
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false
        || (isObjectLike(value) && baseGetTag(value) == boolTag);
    }

    module.exports = isBoolean;
  }, { './_baseGetTag': 30, './isObjectLike': 88 }],
  82: [function (require, module, exports) {
    const root = require('./_root');
    const stubFalse = require('./stubFalse');

    /** Detect free variable `exports`. */
    const freeExports = typeof exports === 'object' && exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    const freeModule = freeExports && typeof module === 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    const moduleExports = freeModule && freeModule.exports === freeExports;

    /** Built-in value references. */
    const Buffer = moduleExports ? root.Buffer : undefined;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    const nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    const isBuffer = nativeIsBuffer || stubFalse;

    module.exports = isBuffer;
  }, { './_root': 72, './stubFalse': 95 }],
  83: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isObject = require('./isObject');

    /** `Object#toString` result references. */
    const asyncTag = '[object AsyncFunction]';
    const funcTag = '[object Function]';
    const genTag = '[object GeneratorFunction]';
    const proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      const tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    module.exports = isFunction;
  }, { './_baseGetTag': 30, './isObject': 87 }],
  84: [function (require, module, exports) {
    /** Used as references for various `Number` constants. */
    const MAX_SAFE_INTEGER = 9007199254740991;

    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
      return typeof value === 'number'
        && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }

    module.exports = isLength;
  }, {}],
  85: [function (require, module, exports) {
    /**
     * Checks if `value` is `null` or `undefined`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is nullish, else `false`.
     * @example
     *
     * _.isNil(null);
     * // => true
     *
     * _.isNil(void 0);
     * // => true
     *
     * _.isNil(NaN);
     * // => false
     */
    function isNil(value) {
      return value == null;
    }

    module.exports = isNil;
  }, {}],
  86: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const numberTag = '[object Number]';

    /**
     * Checks if `value` is classified as a `Number` primitive or object.
     *
     * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are
     * classified as numbers, use the `_.isFinite` method.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(3);
     * // => true
     *
     * _.isNumber(Number.MIN_VALUE);
     * // => true
     *
     * _.isNumber(Infinity);
     * // => true
     *
     * _.isNumber('3');
     * // => false
     */
    function isNumber(value) {
      return typeof value === 'number'
        || (isObjectLike(value) && baseGetTag(value) == numberTag);
    }

    module.exports = isNumber;
  }, { './_baseGetTag': 30, './isObjectLike': 88 }],
  87: [function (require, module, exports) {
    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      const type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    module.exports = isObject;
  }, {}],
  88: [function (require, module, exports) {
    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value === 'object';
    }

    module.exports = isObjectLike;
  }, {}],
  89: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const getPrototype = require('./_getPrototype');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const objectTag = '[object Object]';

    /** Used for built-in method references. */
    const funcProto = Function.prototype;
    const objectProto = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    const funcToString = funcProto.toString;

    /** Used to check objects for own properties. */
    const { hasOwnProperty } = objectProto;

    /** Used to infer the `Object` constructor. */
    const objectCtorString = funcToString.call(Object);

    /**
     * Checks if `value` is a plain object, that is, an object created by the
     * `Object` constructor or one with a `[[Prototype]]` of `null`.
     *
     * @static
     * @memberOf _
     * @since 0.8.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     * }
     *
     * _.isPlainObject(new Foo);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     *
     * _.isPlainObject(Object.create(null));
     * // => true
     */
    function isPlainObject(value) {
      if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
        return false;
      }
      const proto = getPrototype(value);
      if (proto === null) {
        return true;
      }
      const Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
      return typeof Ctor === 'function' && Ctor instanceof Ctor
        && funcToString.call(Ctor) == objectCtorString;
    }

    module.exports = isPlainObject;
  }, { './_baseGetTag': 30, './_getPrototype': 43, './isObjectLike': 88 }],
  90: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isArray = require('./isArray');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const stringTag = '[object String]';

    /**
     * Checks if `value` is classified as a `String` primitive or object.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a string, else `false`.
     * @example
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */
    function isString(value) {
      return typeof value === 'string'
        || (!isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag);
    }

    module.exports = isString;
  }, { './_baseGetTag': 30, './isArray': 79, './isObjectLike': 88 }],
  91: [function (require, module, exports) {
    const baseGetTag = require('./_baseGetTag');
    const isObjectLike = require('./isObjectLike');

    /** `Object#toString` result references. */
    const symbolTag = '[object Symbol]';

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value === 'symbol'
        || (isObjectLike(value) && baseGetTag(value) == symbolTag);
    }

    module.exports = isSymbol;
  }, { './_baseGetTag': 30, './isObjectLike': 88 }],
  92: [function (require, module, exports) {
    const baseIsTypedArray = require('./_baseIsTypedArray');
    const baseUnary = require('./_baseUnary');
    const nodeUtil = require('./_nodeUtil');

    /* Node.js helper references. */
    const nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

    /**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    const isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

    module.exports = isTypedArray;
  }, { './_baseIsTypedArray': 33, './_baseUnary': 37, './_nodeUtil': 69 }],
  93: [function (require, module, exports) {
    const arrayLikeKeys = require('./_arrayLikeKeys');
    const baseKeys = require('./_baseKeys');
    const isArrayLike = require('./isArrayLike');

    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }

    module.exports = keys;
  }, { './_arrayLikeKeys': 26, './_baseKeys': 34, './isArrayLike': 80 }],
  94: [function (require, module, exports) {
    const MapCache = require('./_MapCache');

    /** Error message constants. */
    const FUNC_ERROR_TEXT = 'Expected a function';

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `clear`, `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func !== 'function' || (resolver != null && typeof resolver !== 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function () {
        const args = arguments;
        const key = resolver ? resolver.apply(this, args) : args[0];
        const { cache } = memoized;

        if (cache.has(key)) {
          return cache.get(key);
        }
        const result = func.apply(this, args);
        memoized.cache = cache.set(key, result) || cache;
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }

    // Expose `MapCache`.
    memoize.Cache = MapCache;

    module.exports = memoize;
  }, { './_MapCache': 24 }],
  95: [function (require, module, exports) {
    /**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */
    function stubFalse() {
      return false;
    }

    module.exports = stubFalse;
  }, {}],
  96: [function (require, module, exports) {
    const baseToString = require('./_baseToString');

    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      return value == null ? '' : baseToString(value);
    }

    module.exports = toString;
  }, { './_baseToString': 36 }],
  airtable: [function (require, module, exports) {
    const __importDefault = (this && this.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { default: mod };
    };
    const base_1 = __importDefault(require('./base'));
    const record_1 = __importDefault(require('./record'));
    const table_1 = __importDefault(require('./table'));
    const airtable_error_1 = __importDefault(require('./airtable_error'));
    const Airtable = /** @class */ (function () {
      function Airtable(opts) {
        if (opts === void 0) { opts = {}; }
        const defaultConfig = Airtable.default_config();
        const apiVersion = opts.apiVersion || Airtable.apiVersion || defaultConfig.apiVersion;
        Object.defineProperties(this, {
          _apiKey: {
            value: opts.apiKey || Airtable.apiKey || defaultConfig.apiKey,
          },
          _apiVersion: {
            value: apiVersion,
          },
          _apiVersionMajor: {
            value: apiVersion.split('.')[0],
          },
          _customHeaders: {
            value: opts.customHeaders || {},
          },
          _endpointUrl: {
            value: opts.endpointUrl || Airtable.endpointUrl || defaultConfig.endpointUrl,
          },
          _noRetryIfRateLimited: {
            value: opts.noRetryIfRateLimited
              || Airtable.noRetryIfRateLimited
              || defaultConfig.noRetryIfRateLimited,
          },
          _requestTimeout: {
            value: opts.requestTimeout || Airtable.requestTimeout || defaultConfig.requestTimeout,
          },
        });
        if (!this._apiKey) {
          throw new Error('An API key is required to connect to Airtable');
        }
      }
      Airtable.prototype.base = function (baseId) {
        return base_1.default.createFunctor(this, baseId);
      };
      Airtable.default_config = function () {
        return {
          endpointUrl: '' || 'https://api.airtable.com',
          apiVersion: '0.1.0',
          apiKey: '',
          noRetryIfRateLimited: false,
          requestTimeout: 300 * 1000,
        };
      };
      Airtable.configure = function (_a) {
        const { apiKey } = _a;
        const { endpointUrl } = _a;
        const { apiVersion } = _a;
        const { noRetryIfRateLimited } = _a;
        const { requestTimeout } = _a;
        Airtable.apiKey = apiKey;
        Airtable.endpointUrl = endpointUrl;
        Airtable.apiVersion = apiVersion;
        Airtable.noRetryIfRateLimited = noRetryIfRateLimited;
        Airtable.requestTimeout = requestTimeout;
      };
      Airtable.base = function (baseId) {
        return new Airtable().base(baseId);
      };
      Airtable.Base = base_1.default;
      Airtable.Record = record_1.default;
      Airtable.Table = table_1.default;
      Airtable.Error = airtable_error_1.default;
      return Airtable;
    }());
    module.exports = Airtable;
  }, {
    './airtable_error': 2, './base': 3, './record': 15, './table': 17,
  }],
}, {}, ['airtable']);
