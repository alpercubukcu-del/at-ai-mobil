#include <jni.h>
#include <cstring>
#include <vector>
#include <string>
#include "node.h"
extern "C" JNIEXPORT jint JNICALL Java_tr_ataimobil_app_MainActivity_startNode(JNIEnv *env,jobject,jobjectArray args) {
 std::vector<std::string> strings;size_t size=0;
 for(jsize i=0;i<env->GetArrayLength(args);i++){auto str=(jstring)env->GetObjectArrayElement(args,i);const char *value=env->GetStringUTFChars(str,nullptr);strings.emplace_back(value);size+=strings.back().size()+1;env->ReleaseStringUTFChars(str,value);env->DeleteLocalRef(str);}
 std::vector<char> buffer(size);std::vector<char*> argv;char *p=buffer.data();
 for(const auto& value:strings){std::memcpy(p,value.c_str(),value.size()+1);argv.push_back(p);p+=value.size()+1;}
 return node::Start((int)argv.size(),argv.data());
}
