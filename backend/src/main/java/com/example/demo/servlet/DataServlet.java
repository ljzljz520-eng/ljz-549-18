package com.example.demo.servlet;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/api/data")
public class DataServlet extends HttpServlet {
    private final Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        processRequest(req, resp, true);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        processRequest(req, resp, false);
    }

    private void processRequest(HttpServletRequest req, HttpServletResponse resp, boolean isGet) throws IOException {
        // 1. Simulate Network Delay
        try {
            Thread.sleep(1500); 
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        String inputData = "";
        
        if (isGet) {
             // For GET, read from Query Param
             inputData = req.getParameter("data");
             if (inputData == null) inputData = "GET Request Received (No data param)";
        } else {
            // For POST, read from JSON Payload
            StringBuilder buffer = new StringBuilder();
            BufferedReader reader = req.getReader();
            String line;
            while ((line = reader.readLine()) != null) {
                buffer.append(line);
            }
            
            String requestBody = buffer.toString();
            try {
                JsonObject jsonRequest = gson.fromJson(requestBody, JsonObject.class);
                if (jsonRequest != null && jsonRequest.has("data")) {
                    inputData = jsonRequest.get("data").getAsString();
                }
            } catch (Exception e) {
                // Invalid JSON
                inputData = "Invalid JSON Body";
            }
        }

        Map<String, Object> responseData = new HashMap<>();

        // 3. Collect Request Headers
        Map<String, String> receivedHeaders = new HashMap<>();
        Enumeration<String> headerNames = req.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            receivedHeaders.put(headerName, req.getHeader(headerName));
        }
        responseData.put("receivedHeaders", receivedHeaders);

        // 4. Collect URL Parameters
        Map<String, String> receivedParams = new HashMap<>();
        Map<String, String[]> paramMap = req.getParameterMap();
        for (Map.Entry<String, String[]> entry : paramMap.entrySet()) {
            receivedParams.put(entry.getKey(), String.join(",", entry.getValue()));
        }
        responseData.put("parameters", receivedParams);

        // 5. Error Handling Simulation
        if ("error".equals(inputData)) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            responseData.put("error", "Intentionally triggered client error.");
            responseData.put("code", 400);
        } 
        else if ("server_error".equals(inputData)) {
             resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
             responseData.put("error", "Intentionally triggered server error.");
             responseData.put("code", 500);
        }
        else {
            // 6. Success Logic
            resp.setStatus(HttpServletResponse.SC_OK);
            responseData.put("message", "Server received (" + req.getMethod() + "): " + inputData);
            responseData.put("timestamp", System.currentTimeMillis());
            responseData.put("unicode_test", "接收到的中文: " + inputData);
        }
        
        resp.getWriter().write(gson.toJson(responseData));
    }
}
