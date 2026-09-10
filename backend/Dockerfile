# Stage 1: Dependencies Cache
FROM maven:3.9-eclipse-temurin-17-alpine AS deps
WORKDIR /app
# Correct path for settings.xml in this image
COPY settings.xml /usr/share/maven/ref/settings.xml
COPY pom.xml .
# Use the settings.xml
RUN mvn -s /usr/share/maven/ref/settings.xml dependency:go-offline

# Stage 2: Development (Hot Reload)
FROM deps AS dev
# We assume source is mounted to /app/src
CMD ["mvn", "-s", "/usr/share/maven/ref/settings.xml", "jetty:run"]

# Stage 3: Builder
FROM deps AS builder
COPY src ./src
RUN mvn -s /usr/share/maven/ref/settings.xml package -DskipTests

# Stage 4: Production
FROM tomcat:10.1-jdk17-temurin-jammy AS prod
COPY --from=builder /app/target/*.war /usr/local/tomcat/webapps/ROOT.war
EXPOSE 8080
CMD ["catalina.sh", "run"]
