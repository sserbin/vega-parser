import parseExpression from './expression';
import parseSelector from './event-selector';
import parseStream from './stream';
import {array, error, extend, isString, stringValue} from 'vega-util';

var preamble = 'var datum=event.item&&event.item.datum;';

export default function(spec, scope, target) {
  var events = spec.events,
      update = spec.update,
      encode = spec.encode,
      sources = [],
      value = '', entry;

  if (!events) {
    error('Signal update missing events specification.');
  }

  // interpret as an event selector string
  if (isString(events)) {
    events = parseSelector(events);
  }

  // separate event streams from signal updates
  events = array(events).filter(function(stream) {
    return stream.signal ? (sources.push(stream), 0) : 1;
  });

  // merge event streams, include as source
  if (events.length) {
    sources.push(events.length > 1 ? {merge: events} : events[0]);
  }

  if (encode != null) {
    if (update) error('Signal encode and update are mutually exclusive.');
    update = 'encode(item(),' + stringValue(encode) + ')';
  }

  // resolve update value
  value = isString(update) ? parseExpression(update, scope, preamble)
    : update.expr != null ? parseExpression(update.expr, scope, preamble)
    : update.value != null ? update.value
    : update.signal != null ? {
        $expr:   '_.value',
        $params: {value: scope.signalRef(update.signal)}
      }
    : error('Invalid signal update specification.');

  entry = {
    target: target,
    update: value
  };

  if (spec.force) {
    entry.options = {force: true};
  }

  sources.forEach(function(source) {
    source = {source: parseStream(source, scope)};
    scope.addUpdate(extend(source, entry));
  });
}
