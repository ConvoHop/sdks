#import <Foundation/Foundation.h>
#import <React/RCTInvalidating.h>
#import <RNConvoHopSpec/RNConvoHopSpec.h>

#if __has_include("ConvoHopReactNative-Swift.h")
#import "ConvoHopReactNative-Swift.h"
#else
#import <ConvoHopReactNative/ConvoHopReactNative-Swift.h>
#endif

// The ConvoHopCalls TurboModule: CallKit and PushKit through ConvoHopCalls. Its Swift half, ConvoHopCallsBridge, runs
// on the main thread, which is this module's method queue.
@interface ConvoHopCallsModule
    : NativeConvoHopCallsSpecBase <NativeConvoHopCallsSpec, RCTInvalidating, ConvoHopCallsEmitter>
@end

@implementation ConvoHopCallsModule {
  ConvoHopCallsBridge *_bridge;
}

+ (NSString *)moduleName
{
  return @"ConvoHopCalls";
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  if ((self = [super init])) {
    _bridge = [ConvoHopCallsBridge new];
  }
  return self;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
  [super setEventEmitterCallback:eventEmitterCallbackWrapper];
  // Emitting throws until the callback is set, so the bridge emits only once it's attached.
  __weak ConvoHopCallsModule *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    ConvoHopCallsModule *strongSelf = weakSelf;
    if (strongSelf != nil) {
      [strongSelf->_bridge attachEmitter:strongSelf];
    }
  });
}

- (void)invalidate
{
  [_bridge invalidate];
}

- (void)getCalls:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge getCalls:resolve reject:reject];
}

- (void)forgetCall:(NSString *)callId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge forgetCall:callId resolve:resolve reject:reject];
}

- (void)startOutgoingCall:(JS::NativeConvoHopCalls::OutgoingCallRequest &)request
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  [_bridge startOutgoingCall:request.liveSessionId()
              conversationId:request.conversationId()
                      handle:request.handle()
                 displayName:request.displayName()
                    hasVideo:request.hasVideo()
                     resolve:resolve
                      reject:reject];
}

- (void)answerCall:(NSString *)callId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge answerCall:callId resolve:resolve reject:reject];
}

- (void)endCall:(NSString *)callId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge endCall:callId resolve:resolve reject:reject];
}

- (void)stopRinging:(NSString *)callId
       serverReason:(NSString *)serverReason
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [_bridge stopRinging:callId serverReason:serverReason resolve:resolve reject:reject];
}

- (void)reportConnecting:(NSString *)callId
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  [_bridge reportConnecting:callId resolve:resolve reject:reject];
}

- (void)reportConnected:(NSString *)callId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge reportConnected:callId resolve:resolve reject:reject];
}

- (void)updateCall:(NSString *)callId
            update:(JS::NativeConvoHopCalls::CallUpdate &)update
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  std::optional<bool> hasVideo = update.hasVideo();
  [_bridge updateCall:callId
           callerName:update.callerName()
             hasVideo:hasVideo.has_value() ? @(hasVideo.value()) : nil
              resolve:resolve
               reject:reject];
}

- (void)setMuted:(NSString *)callId
           muted:(BOOL)muted
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject
{
  [_bridge setMuted:callId muted:muted resolve:resolve reject:reject];
}

- (void)setHeld:(NSString *)callId
           held:(BOOL)held
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  [_bridge setHeld:callId held:held resolve:resolve reject:reject];
}

- (void)setAudioRoute:(NSString *)callId
                route:(NSString *)route
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_UNSUPPORTED", @"iOS routes call audio through the system route picker", nil);
}

- (void)canUseFullScreenIntent:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  // CallKit shows every incoming call in the system call UI.
  resolve(@YES);
}

- (void)openFullScreenIntentSettings:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_UNSUPPORTED", @"iOS has no full-screen intent setting", nil);
}

- (void)getVoipToken:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge getVoipToken:resolve reject:reject];
}

- (void)isAudioSessionActive:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_bridge isAudioSessionActive:resolve reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeConvoHopCallsSpecJSI>(params);
}

@end
