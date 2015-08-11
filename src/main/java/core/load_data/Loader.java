package core.load_data;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import server.Context;

import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Envelope;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Polygon;
import com.vividsolutions.jts.geom.PrecisionModel;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;

import core.Config;
import core.shared.Entity;
import core.shared.SpatialEvent;
import core.shared.Table;

public class Loader {

	public static final int FETCH_SIZE = Config.getConfigInt("fetch_size");
	public static final long BATCHINSERT_SIZE = Config.getConfigInt("insert_chunk_size");
	//private static final Integer BATCH_SIZE = Config.getConfigInt("batch_work");

	// Table name from which we will load the data
	//private static final String TABLE_NAME = Config.getConfigString("table_name");
	private static final String POINT_WKT = "POINT(%f %f)";
	private static final String GRAIN = "date";
	public static final String OP_AUTO= "op";
	public static final String AA_MAPS= "aa";

	private Long gridSize;
	private Float maxEffect;
	private Envelope envelope;
	private GeometryFactory geofact;
	private Double precision = 0.00000001; 
	public static Table tableToStore;
	private List<Entity> events;
	private String effectMode;

	public Loader(Table tabletoStore) {
		geofact = new GeometryFactory(new PrecisionModel(), 4326);
		this.envelope = new Envelope(); // Create the envelop that contains all the points
		Loader.tableToStore = tabletoStore;
		this.events = new LinkedList<Entity>();
	}
	
	public Loader() {
		geofact = new GeometryFactory(new PrecisionModel(), 4326);
		this.envelope = new Envelope(); // Create the envelop that contains all the points
		this.events = new LinkedList<Entity>();
	}

	public static void setTableToStore(Table tableToStore) {
		Loader.tableToStore = tableToStore;
	}

	public void uploadData(String fromTable, Long toGridSize, String sql) {
		
		System.out.println(sql);
		try {
			Connection connection = DataStoreInfo.getMetaStore();
			Statement st = connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
			st.setFetchSize(FETCH_SIZE);

			// Build envelope and computes gridsize
			ResultSet resultSet = st.executeQuery(sql);
			Geometry geometry;
			double bestPrecision = 1;
			
			while(resultSet.next()) {
				Entity event = new SpatialEvent();
				
				int minute = resultSet.getInt(1);
				int hour = resultSet.getInt(2);
				int day = resultSet.getInt(3);
				int month = resultSet.getInt(4);
				int year = resultSet.getInt(5);		
				double latitude = resultSet.getDouble(6);
				double longitude = resultSet.getDouble(7);

				String wkt_point = String.format(POINT_WKT, longitude, latitude);
				wkt_point = wkt_point.replace(",", ".");

				geometry = new WKTReader(geofact).read(wkt_point);
				bestPrecision = Functions.findBestPrecision(bestPrecision, geometry);
				precision = precision > bestPrecision ? precision : bestPrecision;

				expand(envelope, geometry);

				// Fill Entity
				event.addProperty("minute", new Integer(minute));
				event.addProperty("hour", new Integer(hour));
				event.addProperty("day", new Integer(day));
				event.addProperty("month", new Integer(month));
				event.addProperty("year", new Integer(year));

				event.setGeometry(geometry);
				// Add Entity
				events.add(event);
			}

			System.out.println("Events size: " + events.size());

			Coordinate minCoordinate = new Coordinate(envelope.getMinX(), envelope.getMinY());
			Coordinate maxCoordinate = new Coordinate(envelope.getMaxX(), envelope.getMaxY());

			// Based on precision computes the next gridsize which is power of two
			gridSize = Functions.computeGridSize(minCoordinate, maxCoordinate, precision);
			tableToStore.createTable(connection);// Create table 
			System.out.println("GridSize: " + gridSize);

			String insertStatement = tableToStore.insertStatement(); // Computes the string insert statement (which have inherent an specific columns order)
			PreparedStatement ps = connection.prepareStatement(insertStatement); 

			Iterator<Entity> it = events.iterator();
			int batchCount = 0;
			Geometry upGeometry = null;
			Integer upGeoHash = null;

			Double x = envelope.getMinX();
			Double y = envelope.getMinY();

			System.out.println("min envelop: " + x);
			System.out.println("max envelop: " + y);

			// Store data in the table specified in the constructor
			while(it.hasNext()) {
				Entity event = it.next();

				int minute = event.getProperty("minute");
				int hour = event.getProperty("hour");
				int day = event.getProperty("day");
				int month = event.getProperty("month");
				int year = event.getProperty("year");
				
				//Dados por vezes sao estranhos
				if(hour > 23 || minute > 60)
					continue;
				
				if(toGridSize >= 4) upGeometry = Functions.convertToUp(event.getGeometry(), new Coordinate(x,y), precision, gridSize, toGridSize);
				else upGeometry = new GeometryFactory().createPoint(envelope.centre());

				upGeoHash = upGeometry.hashCode();

				ps.setString(1, event.getGeometry().toText());
				ps.setInt(2, minute);
				ps.setInt(3, hour);
				ps.setInt(4, day);
				ps.setInt(5, month);
				ps.setInt(6, year);
				ps.setInt(7, upGeoHash);
				ps.setString(8, upGeometry.toText());
				
				String date = year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + "00";
				ps.setString(9, date);

				ps.addBatch();
				if (batchCount == BATCHINSERT_SIZE) {
					ps.executeBatch();
					batchCount = 0;
				} else
					batchCount++;
			}
			ps.executeBatch();


			connection.close();
		} catch (SQLException exception){
			exception.printStackTrace();
		}
	 catch (ParseException exception) {
			exception.printStackTrace();
		}
	}

	private void expand(final Envelope envelope, final Geometry geometry) {
		for (Coordinate coordinate : geometry.getCoordinates())
			envelope.expandToInclude(coordinate);
	}


	/**
	 * 
	 * @param timeGranularity: time granularity can be year, month, day, hour, minute
	 * @param granule: the hashcode of a given spatial granule position
	 * @return
	 *//*
	*//**
	 * @param timeGranularity
	 * @param granule
	 * @param isRestricted
	 * @param polygon
	 * @return
	 */
	public String buildQuery(String timeGranularity, String granule, boolean isRestricted, Polygon polygon) {
		timeGranularity = timeGranularity.toUpperCase();

		String sql = "select up_geo_hash, ";
		String temp = timeGranularity += ",";
		sql += temp;
		sql += ", array_agg(ST_AsText(geometry)) as SpatialObjects, ST_AsText(up_geometry)  from " + tableToStore.getName();
		sql += " where up_geo_hash='" + granule + "'";
		
		if(isRestricted) {
			sql += "and ";
			String template = "ST_Contains(ST_GeomFromText( 'POLYGON((%s))', 4326), geometry)";
			Coordinate[] vertexes = polygon.getCoordinates();
			
			String sqlcoords = "";
			for(int i = 0; i < vertexes.length; i++) {
				sqlcoords += vertexes[i].x + " " + vertexes[i].y;
				if (!(i == vertexes.length - 1))
					sqlcoords += ",";
			}
			
			sql += String.format(template, sqlcoords);
		}
		
		sql += " group by up_geo_hash, " + temp + ", ST_AsText(up_geometry) ";
		sql += " order by up_geo_hash, " + temp;

		return sql;
	}

// This function assumes that we have global timeseries, i.e., only one spatial granule
	public static String getTimeSeries(String tableName, boolean isRestricted) {
System.out.println("getting time series...");
		
		StringBuilder strBuilder = new StringBuilder();
		strBuilder.append("[");

		Connection connection = DataStoreInfo.getMetaStore();
		Statement st;
		try {
			st = connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
			st.setFetchSize(FETCH_SIZE);

			String sqlmeta = "select length from " + tableName;
			
			ResultSet resultSetMeta = st.executeQuery(sqlmeta);
			resultSetMeta.next();

			long length = resultSetMeta.getLong(1); 
			System.out.println("length of the timeseries: " + length);

			String sql = "select type, datetime, value from " + tableName+ " order by type, pos";
			System.out.println("query para ir buscar as series tmeporais: " + sql);
			ResultSet resultSet = st.executeQuery(sql);

			String type="";
			int n = 0;
			while(resultSet.next()) {

				String timeseriesType = resultSet.getString(1);
				if(!timeseriesType.equals(type)) {
					strBuilder.append("{\"type\":\"" + timeseriesType + "\",\"data\":[");
					type = timeseriesType;
				}

				String datetime = resultSet.getString(2);
				BigDecimal value = resultSet.getBigDecimal(3);

				strBuilder.append("{" + datetime + "," + "\"value\":" + value.toString() + "}");
				n++;

				if(n!=length)
					strBuilder.append(",");
				else { 
					if(resultSet.isLast()) {
						strBuilder.append("]");	
					}
					else {
						n = 0; strBuilder.append("]},");	
					}

				}

			}

			connection.close();
		} catch (SQLException e) {
			e.printStackTrace();
		}

		strBuilder.append("}]");
		return strBuilder.toString();
	}


	//Method to be called by server
	public String getInstSpatialEvents(Context context, String date) {
		Connection connection = DataStoreInfo.getMetaStore();
		effectMode = context.getEffectMode();
		
		//Init json constrution
		StringBuilder strBuilder = new StringBuilder();
		String header= "{\"type\":\"FeatureCollection\",\"maxEffect\":%s,\"features\":[";
		String featureTemplate = "{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[%s, %s]},\"effect\": %s}";
		String effect;
		Statement st;
		try {
			st = connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
			st.setFetchSize(FETCH_SIZE);

			String sql = buildInstSpatialQuery(date, context.getFromTable());
			System.out.println("SQL INSTANT SPATIAL EVENTS: " + sql);
			ResultSet resultSet = st.executeQuery(sql);

			while(resultSet.next()) {
				if (resultSet.isFirst()) {
					maxEffect = Float.parseFloat(resultSet.getString(3));
					strBuilder.append(String.format(header, maxEffect));
				}
				effect = getEffectValue(resultSet.getString(3),effectMode);
				strBuilder.append(String.format(featureTemplate, resultSet.getString(1), resultSet.getString(2),effect));
				
				if(!resultSet.isLast())
					strBuilder.append(",");
			}
			strBuilder.append("]}");
			connection.close();
			
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return strBuilder.toString();
	}

	
	
	private String getEffectValue(String effect, String effectMode){
		String[] mode = effectMode.split("_");
		if (mode[0].equals("op")){
			//Equal effect
			if (mode[0].equals("auto")) return effect;
			
			//Relative to max effect
			else {
				float value = Float.parseFloat(effect) / maxEffect;
				return Float.toString(value);
			}
		}
		//AA-Maps calc
		else{}
		return effect;
	}
	
	
	//Method to be called by server
	public String getRangeSpatialEvents(Context context, String dateInit, String dateEnd) {
		Connection connection = DataStoreInfo.getMetaStore();
		effectMode = context.getEffectMode();

		//Init json constrution
		StringBuilder strBuilder = new StringBuilder();
		String header= "{\"type\":\"FeatureCollection\",\"maxEffect\":%s,\"features\":[";
		String featureTemplate = "{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[%s, %s]},\"effect\": %s}";
		
		String table = context.getFromTable();
		String effect;
		Statement st;
	
		try {
			st = connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
			st.setFetchSize(FETCH_SIZE);
			
			String sql = buildRangeSpatialQuery(dateInit, dateEnd, table);
			System.out.println("SQL RANGE SPATIAL EVENTS: " + sql);
			ResultSet resultSet = st.executeQuery(sql);
			
			while(resultSet.next()) {
				if (resultSet.isFirst()) {
					maxEffect = Float.parseFloat(resultSet.getString(3));
					strBuilder.append(String.format(header, maxEffect));
				}
				effect = getEffectValue(resultSet.getString(3),effectMode);
				strBuilder.append(String.format(featureTemplate, resultSet.getString(1), resultSet.getString(2),effect));
				
				if(!resultSet.isLast())
					strBuilder.append(",");
			}
			strBuilder.append("]}");
			connection.close();
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return strBuilder.toString();
	}
	

	public String getAASpatialEvents(Context context, String dateInit, String dateEnd) {
		Connection connection = DataStoreInfo.getMetaStore();
		effectMode = context.getEffectMode();

		//Init json constrution
		StringBuilder strBuilder = new StringBuilder();
		String header= "{\"type\":\"FeatureCollection\",\"maxEffect\":%s,\"features\":[";
		String featureTemplate = "{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[%s, %s]},\"effect\": %s,\"date\": %s}";
		
		String table = context.getFromTable();
		String effect;
		Statement st;
	
		try {
			st = connection.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
			st.setFetchSize(FETCH_SIZE);
			
			String sql = buildAARangeSpatialQuery(dateInit, dateEnd, table);
			System.out.println("SQL AAMAPS SPATIAL EVENTS: " + sql);
			ResultSet resultSet = st.executeQuery(sql);
			
			while(resultSet.next()) {
				if (resultSet.isFirst()) {
					maxEffect = Float.parseFloat(resultSet.getString(3));
					strBuilder.append(String.format(header, maxEffect));
				}
				effect = getEffectValue(resultSet.getString(3),effectMode);
				strBuilder.append(String.format(featureTemplate, resultSet.getString(1), resultSet.getString(2),effect,dateReplace(resultSet.getString(4))));
				
				if(!resultSet.isLast())
					strBuilder.append(",");
			}
			strBuilder.append("]}");
			connection.close();
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return strBuilder.toString();
	}

	
	
	/*****************************QUERY METHODS****************************/
	
	private String buildInstSpatialQuery(String date, String tableName) {
		String sql = "select latitude, longitud, ig, date from " + tableName + " where "+ GRAIN + "='" + date + "'";
		return sql;
	}
	
	private String buildRangeSpatialQuery(String dateInit, String dateEnd, String tableName) {
		String sql = "select latitude, longitud, ig, date from " + tableName + " where ";
		sql += "date >= '" + dateInit + "' and date <='" + dateEnd + "' ORDER BY ig DESC";
		return sql;
	}
	
	private String buildAARangeSpatialQuery(String dateInit, String dateEnd, String tableName) {
		String sql = "select latitude, longitud, ig, date from " + tableName + " where ";
		sql += "date >= '" + dateInit + "' and date <='" + dateEnd + "'";
		return sql;
	}

	
	/*private int dateConversion(String date){
		return Integer.valueOf(date);
	}*/
	
	private String dateReplace(String date){
		return date.replace("/","");
	} 

	public static void main(String[] args) {}
}
