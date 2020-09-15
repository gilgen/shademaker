// Include the AccelStepper library:
#include <AccelStepper.h>

#define X_DIR_PIN 5
#define X_STEP_PIN 2
#define Y_DIR_PIN 6
#define Y_STEP_PIN 3
#define Z_DIR_PIN 7
#define Z_STEP_PIN 4
#define X_STOP_PIN 9
#define Y_STOP_PIN 10
#define Z_STOP_PIN 11
#define ENABLE_PIN 8
#define UP_PIN A0
#define DOWN_PIN A1
#define SOLENOID_PIN A3
#define GEAR_RATIO 5.18181818
#define REVOLUTION (long)(800L * GEAR_RATIO)
#define MAX_SPEED REVOLUTION
#define ACCELERATION MAX_SPEED * 1.5
#define SOLENOID_ENABLE_STEPPER_BUMP -140
#define BOTTOM_POSITION 5 * REVOLUTION

// Create a new instance of the AccelStepper class:
AccelStepper xstepper = AccelStepper(AccelStepper::DRIVER, X_STEP_PIN, X_DIR_PIN);
// AccelStepper ystepper = AccelStepper(AccelStepper::DRIVER, Y_STEP_PIN, Y_DIR_PIN);
// AccelStepper zstepper = AccelStepper(AccelStepper::DRIVER, Z_STEP_PIN, Z_DIR_PIN);
// AccelStepper steppers[] = { xstepper, ystepper, zstepper };

void setup() {
  Serial.begin(9600);
  Serial.print("Initializing\n");

  // Setup pin IO
  pinMode(X_DIR_PIN, OUTPUT);
  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN, OUTPUT);
  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Z_DIR_PIN, OUTPUT);
  pinMode(Z_STEP_PIN, OUTPUT);
  pinMode(X_STOP_PIN, INPUT_PULLUP);
  pinMode(Y_STOP_PIN, INPUT_PULLUP);
  pinMode(Z_STOP_PIN, INPUT_PULLUP);
  pinMode(ENABLE_PIN, OUTPUT);
  pinMode(SOLENOID_PIN, OUTPUT);
  pinMode(UP_PIN, INPUT_PULLUP);
  pinMode(DOWN_PIN, INPUT_PULLUP);

  disableSolenoid();
  setupStepper(&xstepper);

  Serial.println("Done initialization");
  homeZeroPosition(&xstepper);
}

void loop() {
  if (moveBlindsUpButtonActive()) {
    if (!atTop(&xstepper)) {
      xstepper.enableOutputs();
      enableSolenoid();
      xstepper.moveTo(0);
      while(moveBlindsUpButtonActive() && !atTop(&xstepper)) {
        xstepper.run();
      }
      xstepper.stop();
    }
  } else if (moveBlindsDownButtonActive()) {
    if(!atBottom(&xstepper)) {
      xstepper.enableOutputs();
      enableSolenoid();
      xstepper.moveTo(BOTTOM_POSITION);
      while(moveBlindsDownButtonActive() && !atBottom(&xstepper)) {
        xstepper.run();
      }
      xstepper.stop();
    }
  }

  // stop() accounts for acceleration so we may have a bit to run after the switch has turned off
  if (xstepper.distanceToGo() != 0) {
    xstepper.run();
  } else {
    disableSolenoid();
    xstepper.disableOutputs();
  }
}

void setupStepper(AccelStepper *stepper) {
  stepper->setEnablePin(ENABLE_PIN);
  stepper->setPinsInverted(false, false, true);
  stepper->setMaxSpeed(MAX_SPEED);
  stepper->setAcceleration(ACCELERATION);
  stepper->disableOutputs();
}

void homeZeroPosition(AccelStepper *stepper) {
  Serial.println("Homing...");
  stepper->enableOutputs();
  enableSolenoid();
  stepper->moveTo(-10*REVOLUTION);
  while(digitalRead(X_STOP_PIN) == HIGH && stepper->distanceToGo() != 0) {
    stepper->run();
  }
  disableSolenoid();
  stepper->disableOutputs();
  stepper->setCurrentPosition(0);
  Serial.println("Home switch activated");
}

void moveBlindsUp(AccelStepper *stepper) {
  stepper->enableOutputs();
  stepper->runToNewPosition(0);
  stepper->disableOutputs();
}

void moveBlindsDown(AccelStepper *stepper) {
  stepper->enableOutputs();
  stepper->runToNewPosition(BOTTOM_POSITION);
  stepper->disableOutputs();
}

void disableSolenoid() {
  digitalWrite(SOLENOID_PIN, HIGH);
  delay(50);
}

void enableSolenoid() {
  digitalWrite(SOLENOID_PIN, LOW);
  delay(50);
}

boolean atBottom(AccelStepper *stepper) {
  return stepper->currentPosition() == BOTTOM_POSITION;
}

boolean atTop(AccelStepper *stepper) {
  return stepper->currentPosition() == 0;
}

boolean moveBlindsUpButtonActive() {
  return digitalRead(UP_PIN) == LOW;
}

boolean moveBlindsDownButtonActive() {
  return digitalRead(DOWN_PIN) == LOW;
}
