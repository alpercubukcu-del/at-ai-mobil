package tr.ataimobil.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.provider.DocumentsContract;
import android.webkit.*;
import android.widget.TextView;
import android.print.PrintManager;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

public class MainActivity extends Activity {
 static { System.loadLibrary("node"); System.loadLibrary("ataimobil"); }
 public native int startNode(String[] args);
 private static boolean started=false;
 private static volatile Integer runtimeExit;
 private static int port;
 private static String token;
 private WebView web;
 private final ExecutorService io=Executors.newFixedThreadPool(2);
 private final Map<String,Uri> handles=new ConcurrentHashMap<>();
 private final Map<String,Uri> parents=new ConcurrentHashMap<>();
 private final Map<String,Map<String,Uri>> directoryEntries=new ConcurrentHashMap<>();
 private SharedPreferences preferences;
 private String pickerRequest;
 private Uri rootUri;
 private ValueCallback<Uri[]> fileChooser;
 private String downloadRequest;private JSONObject downloadData;
 private final Handler main=new Handler();
 @Override public void onCreate(Bundle state){
  super.onCreate(state);preferences=getSharedPreferences("archive",MODE_PRIVATE);
  TextView loading=new TextView(this);loading.setText("AT AI Mobil hazırlanıyor…");loading.setTextColor(0xffe0edf7);loading.setBackgroundColor(0xff08121e);loading.setPadding(30,60,30,30);setContentView(loading);
  io.execute(()->{try{
   File runtime=new File(getFilesDir(),"runtime");String version=readAsset("node/bundle-version.txt");File stamp=new File(runtime,"bundle-version.txt");
   if(!stamp.isFile()||!readFile(stamp).equals(version)){delete(runtime);copyAssets("node",runtime);}
   synchronized(MainActivity.class){if(!started){port=18743;token=UUID.randomUUID().toString()+UUID.randomUUID();started=true;new Thread(()->{runtimeExit=startNode(new String[]{"node",new File(runtime,"bootstrap.cjs").getAbsolutePath(),String.valueOf(port),token});},"AT-AI-runtime").start();}}
   boolean ready=false;for(int i=0;i<100;i++){try{HttpURLConnection c=(HttpURLConnection)new URL("http://127.0.0.1:"+port+"/__health").openConnection();c.setRequestProperty("Cookie","at_session="+token);c.setConnectTimeout(500);c.setReadTimeout(500);ready=c.getResponseCode()==200;c.disconnect();if(ready)break;}catch(Exception ignored){}Thread.sleep(150);}
   if(!ready){File log=new File(runtime,"startup-error.txt");String detail=log.isFile()?readFile(log):"Servis yanıt vermedi"+(runtimeExit==null?"":" · çıkış kodu "+runtimeExit);throw new IOException("Telefon içindeki analiz servisi başlatılamadı.\n"+detail.replace(token,"[oturum]"));}runOnUiThread(this::openWeb);
  }catch(Exception e){runOnUiThread(()->loading.setText("Başlatılamadı: "+e.getMessage()));}});
 }
 private void openWeb(){
  WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);web=new WebView(this);web.setBackgroundColor(0xff08121e);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.addJavascriptInterface(new Bridge(),"ATAINative");
  web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileChooser!=null)fileChooser.onReceiveValue(null);fileChooser=callback;try{startActivityForResult(params.createIntent(),43);return true;}catch(Exception e){fileChooser.onReceiveValue(null);fileChooser=null;return false;}}});web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();if("http".equals(u.getScheme())&&"127.0.0.1".equals(u.getHost())&&u.getPort()==port)return false;if("https".equals(u.getScheme())||"http".equals(u.getScheme()))startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}});
  web.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});setContentView(web);web.requestApplyInsets();web.loadUrl("http://127.0.0.1:"+port+"/?session="+token);
 }
 public class Bridge {
  @JavascriptInterface public void request(String json){io.execute(()->{String id="";try{JSONObject q=new JSONObject(json);id=q.getString("requestId");String op=q.getString("op");JSONObject a=q.optJSONObject("args");if(a==null)a=new JSONObject();
   if("pick".equals(op)){final String request=id;runOnUiThread(()->pick(request));return;}
   if("download".equals(op)){final String request=id;final JSONObject payload=a;runOnUiThread(()->download(request,payload));return;}
   if("print".equals(op)){runOnUiThread(()->((PrintManager)getSystemService(PRINT_SERVICE)).print("AT AI Mobil",web.createPrintDocumentAdapter("AT AI Mobil"),null));answer(id,true,true);return;}
   answer(id,true,operate(op,a));
  }catch(Exception e){answer(id,false,e.getMessage());}});}
 }
 private void pick(String id){if(pickerRequest!=null){answer(id,false,"Açık klasör seçimini tamamlayın.");return;}pickerRequest=id;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION|Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);startActivityForResult(intent,41);}
 private void download(String id,JSONObject payload){if(downloadRequest!=null){answer(id,false,"Dosya kaydetme penceresini tamamlayın.");return;}downloadRequest=id;downloadData=payload;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(payload.optString("mime","application/octet-stream"));intent.putExtra(Intent.EXTRA_TITLE,payload.optString("name","AT-AI-Arsiv.json"));startActivityForResult(intent,42);}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==43){Uri[] chosen=WebChromeClient.FileChooserParams.parseResult(result,data);if(chosen!=null)for(Uri uri:chosen)if(!"content".equals(uri.getScheme())){chosen=null;break;}if(fileChooser!=null)fileChooser.onReceiveValue(chosen);fileChooser=null;return;}if(request==42){final String id=downloadRequest;final JSONObject payload=downloadData;downloadRequest=null;downloadData=null;if(result!=RESULT_OK||data==null){answer(id,false,"Dosya kaydetme iptal edildi.");return;}final Uri destination=data.getData();io.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(destination,"wt")){if(out==null)throw new IOException("Dosya yazılamadı.");out.write(android.util.Base64.decode(payload.getString("base64"),android.util.Base64.DEFAULT));answer(id,true,true);}catch(Exception e){answer(id,false,e.getMessage());}});return;}if(request!=41)return;String id=pickerRequest;pickerRequest=null;if(result!=RESULT_OK||data==null){answer(id,false,"Klasör seçimi iptal edildi.");return;}try{Uri tree=data.getData();int flags=data.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);getContentResolver().takePersistableUriPermission(tree,flags);preferences.edit().putString("root",tree.toString()).apply();rootUri=tree;directoryEntries.clear();answer(id,true,describe(DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree))));}catch(Exception e){answer(id,false,e.getMessage());}}
 private JSONObject describe(Uri uri)throws Exception {String key=UUID.randomUUID().toString();handles.put(key,uri);String name="",type="";try(Cursor c=getContentResolver().query(uri,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)){if(c!=null&&c.moveToFirst()){name=c.getString(0);type=c.getString(1);}else throw new FileNotFoundException("Arşiv kaydı bulunamadı.");}return new JSONObject().put("id",key).put("name",name).put("kind",DocumentsContract.Document.MIME_TYPE_DIR.equals(type)?"directory":"file");}
 private Uri handle(JSONObject a)throws Exception {Uri uri=handles.get(a.getString("id"));if(uri==null)throw new IOException("Arşiv erişimi yenilenmeli.");return uri;}
 private Object operate(String op,JSONObject a)throws Exception {
  if("restore".equals(op)){String value=preferences.getString("root",null);if(value==null)return JSONObject.NULL;rootUri=Uri.parse(value);return describe(DocumentsContract.buildDocumentUriUsingTree(rootUri,DocumentsContract.getTreeDocumentId(rootUri)));}
  if("remember".equals(op))return true;
  Uri uri=handle(a);
  if("permission".equals(op)){try(Cursor c=getContentResolver().query(uri,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID},null,null,null)){return c!=null&&c.moveToFirst()?"granted":"denied";}}
  if("child".equals(op)){String name=a.getString("name"),kind=a.getString("kind");if(name.contains("/")||name.equals(".")||name.equals("..")||name.length()==0)throw new IOException("Geçersiz dosya adı.");Uri child=find(uri,name);if(child==null&&a.optBoolean("create")){child=DocumentsContract.createDocument(getContentResolver(),uri,"directory".equals(kind)?DocumentsContract.Document.MIME_TYPE_DIR:"application/json",name);if(child!=null)entries(uri).put(name,child);}if(child==null)throw new FileNotFoundException("Kayıt bulunamadı: "+name);JSONObject d=describe(child);parents.put(d.getString("id"),uri);if(!kind.equals(d.getString("kind")))throw new IOException("Arşiv türü uyuşmuyor.");return d;}
  if("entries".equals(op)){JSONArray list=new JSONArray();try(Cursor c=children(uri)){while(c!=null&&c.moveToNext()){JSONObject d=describe(DocumentsContract.buildDocumentUriUsingTree(rootUri,c.getString(0)));parents.put(d.getString("id"),uri);list.put(d);}}return list;}
  if("read".equals(op)){try(InputStream in=getContentResolver().openInputStream(uri)){return read(in);}}
  if("write".equals(op)){writeDocument(a.getString("id"),uri,a.getString("text").getBytes(StandardCharsets.UTF_8));return true;}
  if("remove".equals(op)){Uri child=find(uri,a.getString("name"));if(child!=null&&!DocumentsContract.deleteDocument(getContentResolver(),child))throw new IOException("Dosya silinemedi.");entries(uri).remove(a.getString("name"));return true;}
  throw new IOException("Desteklenmeyen arşiv işlemi: "+op);
 }
 private Cursor children(Uri uri){return getContentResolver().query(DocumentsContract.buildChildDocumentsUriUsingTree(rootUri,DocumentsContract.getDocumentId(uri)),new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null);}
 private Map<String,Uri> entries(Uri parent){return directoryEntries.computeIfAbsent(parent.toString(),key->{Map<String,Uri> items=new ConcurrentHashMap<>();try(Cursor c=children(parent)){while(c!=null&&c.moveToNext())items.put(c.getString(1),DocumentsContract.buildDocumentUriUsingTree(rootUri,c.getString(0)));}return items;});}
 private Uri find(Uri parent,String name){return entries(parent).get(name);}
 private void writeDocument(String id,Uri original,byte[] bytes)throws Exception {
  Uri parent=parents.get(id);String name="";boolean rename=false;
  try(Cursor c=getContentResolver().query(original,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_FLAGS},null,null,null)){if(c!=null&&c.moveToFirst()){name=c.getString(0);rename=(c.getLong(1)&DocumentsContract.Document.FLAG_SUPPORTS_RENAME)!=0;}}
  if(parent!=null&&rename){Uri temporary=DocumentsContract.createDocument(getContentResolver(),parent,"application/json",".ATAI-"+UUID.randomUUID()+".tmp"),backup=null,newFile=null;try{
   writeBytes(temporary,bytes);backup=DocumentsContract.renameDocument(getContentResolver(),original,".ATAI-old-"+UUID.randomUUID()+".tmp");if(backup==null)throw new IOException("Eski arşiv korunamadı.");newFile=DocumentsContract.renameDocument(getContentResolver(),temporary,name);if(newFile==null)throw new IOException("Yeni arşiv kaydedilemedi.");final Uri committed=newFile;handles.replaceAll((key,value)->value.equals(original)?committed:value);entries(parent).put(name,newFile);try{DocumentsContract.deleteDocument(getContentResolver(),backup);}catch(Exception ignored){}
  }catch(Exception error){if(backup!=null&&newFile==null){Uri restored=DocumentsContract.renameDocument(getContentResolver(),backup,name);if(restored!=null){final Uri recovered=restored;handles.replaceAll((key,value)->value.equals(original)?recovered:value);entries(parent).put(name,restored);}}if(newFile==null&&temporary!=null)try{DocumentsContract.deleteDocument(getContentResolver(),temporary);}catch(Exception ignored){}throw error;}
  }else{byte[] backup;try(InputStream in=getContentResolver().openInputStream(original)){backup=read(in).getBytes(StandardCharsets.UTF_8);}try{writeBytes(original,bytes);}catch(Exception error){try{writeBytes(original,backup);}catch(Exception restoreError){error.addSuppressed(restoreError);}throw error;}}
 }
 private void writeBytes(Uri uri,byte[] bytes)throws IOException {if(uri==null)throw new IOException("Dosya oluşturulamadı.");try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException("Dosya yazılamadı.");out.write(bytes);out.flush();}}
 private void answer(String id,boolean ok,Object value){if(id==null)return;try{JSONObject response=new JSONObject().put("requestId",id).put("ok",ok).put("value",value==null?JSONObject.NULL:value);runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.__ATAndroidResolve("+response+");",null);});}catch(Exception ignored){}}
 private String read(InputStream stream)throws IOException {if(stream==null)throw new FileNotFoundException();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[32768];int n;while((n=stream.read(b))>=0){if(out.size()+n>64*1024*1024)throw new IOException("Arşiv dosyası 64 MB sınırını aşıyor.");out.write(b,0,n);}return new String(out.toByteArray(),StandardCharsets.UTF_8);}
 private String readAsset(String name)throws IOException {try(InputStream in=getAssets().open(name)){return read(in);}}
 private String readFile(File file)throws IOException {try(InputStream in=new FileInputStream(file)){return read(in);}}
 private void copyAssets(String source,File target)throws IOException {String[] entries=getAssets().list(source);if(entries!=null&&entries.length>0){if(!target.isDirectory()&&!target.mkdirs())throw new IOException("Uygulama klasörü oluşturulamadı.");for(String name:entries)copyAssets(source+"/"+name,new File(target,name));}else{try(InputStream in=getAssets().open(source);OutputStream out=new FileOutputStream(target)){byte[] b=new byte[32768];int n;while((n=in.read(b))>=0)out.write(b,0,n);}}}
 private void delete(File file){if(file.isDirectory()){File[] children=file.listFiles();if(children!=null)for(File child:children)delete(child);}file.delete();}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("ATAINative");web.destroy();web=null;}super.onDestroy();}
}
