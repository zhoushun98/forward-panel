FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-Xmx512m -Xms256m -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai"
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY ./target/*.jar app.jar
EXPOSE 6365

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]