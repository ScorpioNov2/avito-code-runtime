// Patch cho worker-java.js của live-codes/java (Apache-2.0): bản gốc chỉ trả stdout/stderr MỘT CỤC khi chương trình
// chạy xong, nên `System.out.println` rồi `Thread.sleep(10000)` phải đợi 10 giây mới thấy chữ.
// Patch này gửi thêm từng dòng ngay khi chương trình in, qua kênh `progress` mà thư viện đã chuyển tiếp sẵn
// (stage = "stdout" | "stderr"). Kết quả cuối cùng vẫn giữ nguyên, phía client dùng nó để bù phần chưa được stream.
//
// Mỗi chuỗi cần thay phải khớp CHÍNH XÁC số lần mong đợi, nếu không patch báo lỗi ngay thay vì âm thầm hỏng.

const STREAM_HELPERS = `/* avito-code patch: stream stdout/stderr line by line (see scripts/patches/javaStreamOutput.mjs) */
var __avitoPendingLine={stdout:"",stderr:""};
function __avitoStream(stream,code){__avitoPendingLine[stream]+=String.fromCharCode(code&65535);if(code===10){postMessage({type:"progress",stage:stream,detail:__avitoPendingLine[stream]});__avitoPendingLine[stream]=""}}
function __avitoPostResult(message){__avitoPendingLine.stdout="";__avitoPendingLine.stderr="";postMessage(message)}
`;

function replaceExactly(text, search, replacement, expectedCount) {
  const parts = text.split(search);
  const actualCount = parts.length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`Patch failed: expected ${expectedCount} match(es) of ${JSON.stringify(search)}, found ${actualCount}`);
  }
  return parts.join(replacement);
}

export function patchJavaWorker(source) {
  let patched = source;
  patched = replaceExactly(patched, 'putcharStdout=T=>{c+=String.fromCharCode(T&65535)}', 'putcharStdout=T=>{c+=String.fromCharCode(T&65535),__avitoStream("stdout",T)}', 1);
  patched = replaceExactly(patched, 'putcharStderr=T=>{i+=String.fromCharCode(T&65535)}', 'putcharStderr=T=>{i+=String.fromCharCode(T&65535),__avitoStream("stderr",T)}', 1);
  patched = replaceExactly(patched, 'postMessage({type:"result"', '__avitoPostResult({type:"result"', 2);
  return STREAM_HELPERS + patched;
}
