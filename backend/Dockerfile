# syntax=docker/dockerfile:1

# --- Build stage ---
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# Copy Maven descriptor first to leverage layer caching
COPY pom.xml ./
# Copy source
COPY src ./src

# Build the application
RUN mvn -B -DskipTests package

# --- Runtime stage ---
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the fat jar from the build stage
COPY --from=build /workspace/target/multicloud-0.0.1-SNAPSHOT.jar app.jar

# Render will inject PORT; expose default 8080 as a hint
EXPOSE 8080

# Allow passing additional JVM opts via JAVA_OPTS
ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
